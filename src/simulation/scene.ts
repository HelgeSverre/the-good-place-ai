import Anthropic from '@anthropic-ai/sdk';
import { streamer } from './dialogue-stream.js';
import { LogWriter } from './log-writer.js';
import { parseDialogue, getCombinedAction, type ParsedDialogue } from './dialogue-formatter.js';
import { createCharacterAgents } from '../agents/character-factory.js';
import { createOrchestratorAgent, parseOrchestratorOutput, type ScenarioContext } from '../agents/orchestrator.js';
import { getCharacterColor } from '../utils/colors.js';
import type { CharacterSheet } from '../characters/types.js';
import type { AgentConfig, DialogueTurn } from '../agents/types.js';

// Event emitter interface for web/external consumers
export interface SceneEventEmitter {
  onSceneStart(title: string, setting: string): void;
  onSceneDirection(content: string): void;
  onDialogueStart(character: string, color: string): void;
  onDialogueChunk(text: string): void;
  onDialogueEnd(parsed: ParsedDialogue): void;
  onSceneEnd(summary?: string): void;
  onError(error: Error): void;
}

// Control interface for pause/abort
export interface SceneControl {
  pauseSignal: { paused: boolean };
  abortSignal: AbortSignal;
}

export interface SceneOptions {
  maxTurns?: number;
  verbose?: boolean;
  noLog?: boolean;
  maxHistoryMessages?: number;
  maxCharacterHistoryMessages?: number;
  // Web interface support
  emitter?: SceneEventEmitter;
  control?: SceneControl;
}

export class SceneExecutor {
  private client: Anthropic;
  private characterAgents: Map<string, AgentConfig>;
  private orchestratorAgent: AgentConfig;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private characterHistories: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> = new Map();
  private recentDialogue: DialogueTurn[] = [];
  private verbose: boolean;
  private logWriter: LogWriter | null = null;
  private scenarioContext: ScenarioContext;
  private maxHistoryMessages: number;
  private maxCharacterHistoryMessages: number;
  // Web interface support
  private emitter: SceneEventEmitter | null;
  private control: SceneControl | null;

  constructor(
    characters: CharacterSheet[],
    scenario: ScenarioContext,
    options: SceneOptions = {}
  ) {
    this.client = new Anthropic();
    this.characterAgents = createCharacterAgents(characters);
    this.orchestratorAgent = createOrchestratorAgent(scenario);
    this.verbose = options.verbose || false;
    this.scenarioContext = scenario;
    this.maxHistoryMessages = options.maxHistoryMessages ?? 20;
    this.maxCharacterHistoryMessages = options.maxCharacterHistoryMessages ?? 16;
    this.emitter = options.emitter || null;
    this.control = options.control || null;

    // Initialize character histories
    for (const name of this.characterAgents.keys()) {
      this.characterHistories.set(name, []);
    }

    // Initialize log writer unless disabled
    if (!options.noLog) {
      this.logWriter = new LogWriter({
        scenarioName: scenario.name,
        characters: scenario.characters,
      });
    }
  }

  // Check if we should abort
  private isAborted(): boolean {
    return this.control?.abortSignal.aborted || false;
  }

  // Wait while paused
  private async waitWhilePaused(): Promise<void> {
    while (this.control?.pauseSignal.paused && !this.isAborted()) {
      await this.delay(100);
    }
  }

  async runScene(maxTurns: number = 30): Promise<void> {
    const title = this.orchestratorAgent.systemPrompt.match(/\*\*Title:\*\* (.+)/)?.[1] || 'Scene';
    const setting = this.scenarioContext.setting || '';

    // Emit scene start
    if (this.emitter) {
      this.emitter.onSceneStart(title, setting);
    } else {
      streamer.printTitle(title);
    }

    let turnCount = 0;
    let sceneEnded = false;
    let sceneSummary: string | undefined;

    // Get initial scene setup from orchestrator
    try {
      await this.waitWhilePaused();
      if (this.isAborted()) return;

      const initialOutput = await this.getOrchestratorResponse('Begin the scene. Set it up and choose who speaks first.');
      const initialParsed = parseOrchestratorOutput(initialOutput);

      if (initialParsed.type === 'scene') {
        if (this.emitter) {
          this.emitter.onSceneDirection(initialParsed.content);
        } else {
          streamer.printSceneDirection(initialParsed.content);
        }
        this.logWriter?.logSceneDirection(initialParsed.content);
      }

      // If orchestrator immediately chose a speaker, handle that
      if (initialParsed.type === 'next') {
        await this.handleCharacterTurn(initialParsed.speaker, initialParsed.context || 'Start the conversation');
        turnCount++;
      }
    } catch (error) {
      if (this.emitter) {
        this.emitter.onError(error as Error);
      } else {
        streamer.printError(`Failed to start scene: ${(error as Error).message}`);
      }
      return;
    }

    // Main scene loop
    while (!sceneEnded && turnCount < maxTurns) {
      // Check for abort
      if (this.isAborted()) {
        break;
      }

      // Wait while paused
      await this.waitWhilePaused();
      if (this.isAborted()) break;

      try {
        // Ask orchestrator what happens next
        const recentContext = this.getRecentDialogueContext();
        const orchestratorOutput = await this.getOrchestratorResponse(
          `Here's what just happened:\n${recentContext}\n\nWhat happens next?`
        );

        if (this.isAborted()) break;

        const parsed = parseOrchestratorOutput(orchestratorOutput);

        if (parsed.type === 'end') {
          if (this.emitter) {
            this.emitter.onSceneEnd(parsed.summary);
          } else {
            streamer.printSceneEnd(parsed.button, parsed.summary);
          }
          sceneSummary = parsed.summary;
          sceneEnded = true;
          break;
        }

        if (parsed.type === 'scene') {
          if (this.emitter) {
            this.emitter.onSceneDirection(parsed.content);
          } else {
            streamer.printSceneDirection(parsed.content);
          }
          this.logWriter?.logSceneDirection(parsed.content);

          // Continue to get next speaker
          await this.waitWhilePaused();
          if (this.isAborted()) break;

          const nextOutput = await this.getOrchestratorResponse('Who speaks next?');
          const nextParsed = parseOrchestratorOutput(nextOutput);
          if (nextParsed.type === 'next') {
            await this.handleCharacterTurn(nextParsed.speaker, nextParsed.context || '');
            turnCount++;
          } else if (nextParsed.type === 'end') {
            if (this.emitter) {
              this.emitter.onSceneEnd(nextParsed.summary);
            } else {
              streamer.printSceneEnd(nextParsed.button, nextParsed.summary);
            }
            sceneSummary = nextParsed.summary;
            sceneEnded = true;
          }
        } else if (parsed.type === 'next') {
          await this.handleCharacterTurn(parsed.speaker, parsed.context || '');
          turnCount++;
        }

        // Small delay for readability
        await this.delay(100);
      } catch (error) {
        if (this.emitter) {
          this.emitter.onError(error as Error);
        } else {
          streamer.printError(`Scene error: ${(error as Error).message}`);
          if (this.verbose) {
            console.error(error);
          }
        }
        sceneEnded = true;
      }
    }

    if (!sceneEnded && !this.isAborted()) {
      const summary = 'Scene ended (maximum turns reached)';
      if (this.emitter) {
        this.emitter.onSceneEnd(summary);
      } else {
        streamer.printSceneEnd(undefined, summary);
      }
    }

    // Finalize log
    if (this.logWriter) {
      this.logWriter.finalize(sceneSummary);
      if (!this.emitter) {
        streamer.printSuccess(`Log saved to: ${this.logWriter.getFilePath()}`);
      }
    }
  }

  private async handleCharacterTurn(characterName: string, context: string): Promise<void> {
    // Check for abort before starting
    if (this.isAborted()) return;
    await this.waitWhilePaused();
    if (this.isAborted()) return;

    const agent = this.characterAgents.get(characterName);
    if (!agent) {
      // Try to find by partial match
      const found = Array.from(this.characterAgents.entries()).find(
        ([name]) => name.toLowerCase().includes(characterName.toLowerCase()) ||
          characterName.toLowerCase().includes(name.toLowerCase())
      );
      if (found) {
        return this.handleCharacterTurn(found[0], context);
      }
      if (this.verbose && !this.emitter) {
        streamer.printDebug(`Character not found: ${characterName}`);
      }
      return;
    }

    const history = this.characterHistories.get(characterName) || [];
    const recentContext = this.getRecentDialogueContext();

    const prompt = context
      ? `Scene context: ${context}\n\nRecent dialogue:\n${recentContext}\n\nIt's your turn to speak. Respond in character.`
      : `Recent dialogue:\n${recentContext}\n\nIt's your turn to speak. Respond in character.`;

    // Add user message to history
    history.push({ role: 'user', content: prompt });

    try {
      const fullResponse = await this.generateCharacterLine(agent, history);

      // Clean up the full response - remove character name prefix if present
      const cleanedResponse = fullResponse.replace(new RegExp(`^${characterName}:\\s*`, 'i'), '').trim();

      // Parse and display formatted output
      const parsed = parseDialogue(cleanedResponse, characterName);

      if (this.emitter) {
        this.emitter.onDialogueEnd(parsed);
      } else {
        streamer.printFormattedDialogue(characterName, parsed);
      }

      // Log to file
      if (this.logWriter) {
        const action = getCombinedAction(parsed);
        this.logWriter.logDialogue(characterName, action, parsed.dialogue);
      }

      // Add assistant response to history
      history.push({ role: 'assistant', content: cleanedResponse });

      // Trim history to max size
      if (history.length > this.maxCharacterHistoryMessages) {
        history.splice(0, history.length - this.maxCharacterHistoryMessages);
      }
      this.characterHistories.set(characterName, history);

      // Track dialogue
      this.recentDialogue.push({
        character: characterName,
        dialogue: cleanedResponse,
      });

      // Keep only last 10 turns
      if (this.recentDialogue.length > 10) {
        this.recentDialogue.shift();
      }
    } catch (error) {
      if (this.emitter) {
        this.emitter.onError(error as Error);
      } else {
        streamer.printError(`${characterName} glitched: ${(error as Error).message}`);
      }

      // Add an in-universe glitch message to keep the scene going
      this.recentDialogue.push({
        character: characterName,
        dialogue: `[${characterName} stares blankly into the void for a moment, then snaps back]`,
      });
    }
  }

  private async generateCharacterLine(
    agent: AgentConfig,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const color = getCharacterColor(agent.name);

    // Emit dialogue start
    if (this.emitter) {
      this.emitter.onDialogueStart(agent.name, color);
    } else {
      streamer.startCharacterTurn(agent.name);
    }

    let fullResponse = '';
    let lastError: unknown;

    for (let attempt = 0; attempt <= 2; attempt++) {
      // Check for abort
      if (this.isAborted()) {
        throw new Error('Scene aborted');
      }

      try {
        fullResponse = '';
        const stream = this.client.messages.stream({
          model: agent.model,
          max_tokens: 300,
          system: agent.systemPrompt,
          messages: history,
        });

        for await (const event of stream) {
          // Check for abort during streaming
          if (this.isAborted()) {
            throw new Error('Scene aborted');
          }

          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullResponse += text;
            if (this.emitter) {
              this.emitter.onDialogueChunk(text);
            } else {
              streamer.bufferText(text);
            }
          }
        }

        return fullResponse;
      } catch (err) {
        // Re-throw abort errors
        if ((err as Error).message === 'Scene aborted') {
          throw err;
        }

        lastError = err;
        const status = (err as any)?.status;
        const isRateLimit = status === 429;
        const delayMs = isRateLimit ? 1000 * (attempt + 1) : 500 * attempt;

        if (this.verbose && !this.emitter) {
          streamer.printError(`[character:${agent.name}] attempt ${attempt + 1} failed: ${(err as Error).message}`);
        }

        if (attempt < 2) {
          await this.delay(delayMs);
        }
      }
    }

    throw new Error(`[character:${agent.name}] failed after 3 attempts: ${(lastError as Error).message}`);
  }

  private async getOrchestratorResponse(prompt: string): Promise<string> {
    // Check for abort
    if (this.isAborted()) {
      throw new Error('Scene aborted');
    }

    this.conversationHistory.push({ role: 'user', content: prompt });

    // Trim history to max size
    if (this.conversationHistory.length > this.maxHistoryMessages) {
      this.conversationHistory.splice(0, this.conversationHistory.length - this.maxHistoryMessages);
    }

    const response = await this.callAnthropicWithRetry(
      () => this.client.messages.create({
        model: this.orchestratorAgent.model,
        max_tokens: 500,
        system: this.orchestratorAgent.systemPrompt,
        messages: this.conversationHistory,
      }),
      'orchestrator'
    );

    const first = response.content[0];
    if (!first || first.type !== 'text') {
      throw new Error('Unexpected Anthropic response format (expected text content)');
    }
    const text = first.text;

    this.conversationHistory.push({ role: 'assistant', content: text });

    if (this.verbose && !this.emitter) {
      streamer.printDebug(`Orchestrator: ${text.substring(0, 100)}...`);
    }

    return text;
  }

  private async callAnthropicWithRetry<T>(
    fn: () => Promise<T>,
    label: string,
    retries = 2
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      // Check for abort
      if (this.isAborted()) {
        throw new Error('Scene aborted');
      }

      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const status = (err as any)?.status;
        const isRateLimit = status === 429;
        const delayMs = isRateLimit ? 1000 * (attempt + 1) : 500 * attempt;

        if (this.verbose && !this.emitter) {
          streamer.printError(`[${label}] attempt ${attempt + 1} failed: ${(err as Error).message}`);
        }

        if (attempt < retries) {
          await this.delay(delayMs);
        }
      }
    }

    throw new Error(`[${label}] failed after ${retries + 1} attempts: ${(lastError as Error).message}`);
  }

  private getRecentDialogueContext(): string {
    if (this.recentDialogue.length === 0) {
      return '(No dialogue yet)';
    }

    return this.recentDialogue
      .map(turn => `${turn.character}: "${turn.dialogue}"`)
      .join('\n');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
