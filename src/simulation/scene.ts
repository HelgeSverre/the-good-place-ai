import Anthropic from '@anthropic-ai/sdk';
import { streamer } from './dialogue-stream.js';
import { LogWriter } from './log-writer.js';
import { parseDialogue, getCombinedAction } from './dialogue-formatter.js';
import { createCharacterAgents } from '../agents/character-factory.js';
import { createOrchestratorAgent, parseOrchestratorOutput, type ScenarioContext } from '../agents/orchestrator.js';
import type { CharacterSheet } from '../characters/types.js';
import type { AgentConfig, DialogueTurn } from '../agents/types.js';

export interface SceneOptions {
  maxTurns?: number;
  verbose?: boolean;
  noLog?: boolean;
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

  async runScene(maxTurns: number = 30): Promise<void> {
    const title = this.orchestratorAgent.systemPrompt.match(/\*\*Title:\*\* (.+)/)?.[1] || 'Scene';
    streamer.printTitle(title);

    let turnCount = 0;
    let sceneEnded = false;
    let sceneSummary: string | undefined;

    // Get initial scene setup from orchestrator
    const initialOutput = await this.getOrchestratorResponse('Begin the scene. Set it up and choose who speaks first.');
    const initialParsed = parseOrchestratorOutput(initialOutput);

    if (initialParsed.type === 'scene') {
      streamer.printSceneDirection(initialParsed.content);
      this.logWriter?.logSceneDirection(initialParsed.content);
    }

    // If orchestrator immediately chose a speaker, handle that
    if (initialParsed.speaker) {
      await this.handleCharacterTurn(initialParsed.speaker, initialParsed.context || 'Start the conversation');
      turnCount++;
    }

    // Main scene loop
    while (!sceneEnded && turnCount < maxTurns) {
      // Ask orchestrator what happens next
      const recentContext = this.getRecentDialogueContext();
      const orchestratorOutput = await this.getOrchestratorResponse(
        `Here's what just happened:\n${recentContext}\n\nWhat happens next?`
      );

      const parsed = parseOrchestratorOutput(orchestratorOutput);

      if (parsed.type === 'end') {
        streamer.printSceneEnd(parsed.button, parsed.summary);
        sceneSummary = parsed.summary;
        sceneEnded = true;
        break;
      }

      if (parsed.type === 'scene') {
        streamer.printSceneDirection(parsed.content);
        this.logWriter?.logSceneDirection(parsed.content);
        // Continue to get next speaker
        const nextOutput = await this.getOrchestratorResponse('Who speaks next?');
        const nextParsed = parseOrchestratorOutput(nextOutput);
        if (nextParsed.speaker) {
          await this.handleCharacterTurn(nextParsed.speaker, nextParsed.context || '');
          turnCount++;
        } else if (nextParsed.type === 'end') {
          streamer.printSceneEnd(nextParsed.button, nextParsed.summary);
          sceneSummary = nextParsed.summary;
          sceneEnded = true;
        }
      } else if (parsed.speaker) {
        await this.handleCharacterTurn(parsed.speaker, parsed.context || '');
        turnCount++;
      }

      // Small delay for readability
      await this.delay(100);
    }

    if (!sceneEnded) {
      streamer.printSceneEnd(undefined, 'Scene ended (maximum turns reached)');
    }

    // Finalize log
    if (this.logWriter) {
      this.logWriter.finalize(sceneSummary);
      streamer.printSuccess(`Log saved to: ${this.logWriter.getFilePath()}`);
    }
  }

  private async handleCharacterTurn(characterName: string, context: string): Promise<void> {
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
      if (this.verbose) {
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

    // Buffer the response for formatted output
    streamer.startCharacterTurn(characterName);

    let fullResponse = '';

    const stream = await this.client.messages.stream({
      model: agent.model,
      max_tokens: 300,
      system: agent.systemPrompt,
      messages: history,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        fullResponse += text;
        streamer.bufferText(text);
      }
    }

    // Clean up the full response - remove character name prefix if present
    fullResponse = fullResponse.replace(new RegExp(`^${characterName}:\\s*`, 'i'), '').trim();

    // Parse and display formatted output
    const parsed = parseDialogue(fullResponse, characterName);
    streamer.printFormattedDialogue(characterName, parsed);

    // Log to file
    if (this.logWriter) {
      const action = getCombinedAction(parsed);
      this.logWriter.logDialogue(characterName, action, parsed.dialogue);
    }

    // Add assistant response to history
    history.push({ role: 'assistant', content: fullResponse });
    this.characterHistories.set(characterName, history);

    // Track dialogue
    this.recentDialogue.push({
      character: characterName,
      dialogue: fullResponse,
    });

    // Keep only last 10 turns
    if (this.recentDialogue.length > 10) {
      this.recentDialogue.shift();
    }
  }

  private async getOrchestratorResponse(prompt: string): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: prompt });

    const response = await this.client.messages.create({
      model: this.orchestratorAgent.model,
      max_tokens: 500,
      system: this.orchestratorAgent.systemPrompt,
      messages: this.conversationHistory,
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';

    this.conversationHistory.push({ role: 'assistant', content: text });

    if (this.verbose) {
      streamer.printDebug(`Orchestrator: ${text.substring(0, 100)}...`);
    }

    return text;
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
