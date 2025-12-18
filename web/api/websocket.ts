// WebSocket handler and session management

import type { ServerWebSocket } from 'bun';
import { SceneExecutor } from '../../src/simulation/scene.js';
import { getCharacterColor } from '../../src/utils/colors.js';
import type { CharacterSheet } from '../../src/characters/types.js';
import type { Scenario } from '../../src/scenarios/types.js';
import type { ParsedDialogue } from '../../src/simulation/dialogue-formatter.js';
import type {
  ServerMessage,
  ClientMessage,
  SceneStatus,
  CharacterSummary,
  ScenarioSummary,
  DialogueEntry,
} from '../shared/protocol.js';
import { getCharacters, getScenarios, toCharacterSummary, toScenarioSummary } from './routes.js';

// Session data stored per WebSocket connection
interface SessionData {
  sessionId: string;
}

// Scene session managed by the server
interface SceneSession {
  id: string;
  executor: SceneExecutor | null;
  status: SceneStatus;
  client: ServerWebSocket<SessionData> | null;
  pauseSignal: { paused: boolean };
  abortController: AbortController;
  scenario: ScenarioSummary | null;
  characters: CharacterSummary[];
  dialogue: DialogueEntry[];
  turnCount: number;
}

// Active sessions
const sessions = new Map<string, SceneSession>();

// Generate unique session ID
function generateSessionId(): string {
  return `scene-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Create a new session
export function createSession(): string {
  const sessionId = generateSessionId();
  const session: SceneSession = {
    id: sessionId,
    executor: null,
    status: 'idle',
    client: null,
    pauseSignal: { paused: false },
    abortController: new AbortController(),
    scenario: null,
    characters: [],
    dialogue: [],
    turnCount: 0,
  };
  sessions.set(sessionId, session);
  return sessionId;
}

// Get session by ID
export function getSession(sessionId: string): SceneSession | undefined {
  return sessions.get(sessionId);
}

// Send message to session's client
function send(session: SceneSession, message: ServerMessage): void {
  if (session.client?.readyState === WebSocket.OPEN) {
    session.client.send(JSON.stringify(message));
  }
}

// Add dialogue entry to session
function addDialogueEntry(session: SceneSession, entry: Omit<DialogueEntry, 'id' | 'timestamp'>): DialogueEntry {
  const fullEntry: DialogueEntry = {
    ...entry,
    id: `${session.id}-${session.dialogue.length}`,
    timestamp: Date.now(),
  };
  session.dialogue.push(fullEntry);
  return fullEntry;
}

// Scene event emitter that broadcasts to WebSocket
function createSceneEmitter(session: SceneSession) {
  return {
    onSceneStart(title: string, setting: string): void {
      send(session, { type: 'scene_start', title, setting });
    },

    onSceneDirection(content: string): void {
      addDialogueEntry(session, { type: 'direction', content });
      send(session, { type: 'scene_direction', content });
    },

    onDialogueStart(character: string, color: string): void {
      send(session, { type: 'dialogue_start', character, color });
    },

    onDialogueChunk(text: string): void {
      send(session, { type: 'dialogue_chunk', text });
    },

    onDialogueEnd(parsed: ParsedDialogue): void {
      const color = getCharacterColor(parsed.characterName || 'Unknown');
      addDialogueEntry(session, {
        type: 'dialogue',
        character: parsed.characterName || 'Unknown',
        color,
        stageDirections: parsed.stageDirections,
        emotions: parsed.emotions,
        dialogue: parsed.dialogue,
      });
      session.turnCount++;
      send(session, { type: 'dialogue_end', parsed });
    },

    onSceneEnd(summary?: string): void {
      session.status = 'complete';
      send(session, { type: 'scene_end', summary });
      send(session, { type: 'status_change', status: 'complete' });
    },

    onError(error: Error): void {
      session.status = 'error';
      send(session, { type: 'error', message: error.message });
      send(session, { type: 'status_change', status: 'error' });
    },
  };
}

// Start a scene in the session
async function startScene(
  session: SceneSession,
  scenarioId: string,
  characterIds?: string[]
): Promise<void> {
  try {
    // Load data
    const allCharacters = await getCharacters();
    const allScenarios = await getScenarios();

    // Find scenario
    const scenario = allScenarios.find((s) => s.id === scenarioId);
    if (!scenario) {
      send(session, { type: 'error', message: `Scenario not found: ${scenarioId}` });
      return;
    }

    // Select characters
    const requiredNames = scenario.requiredCharacters;
    const selectedCharacters = allCharacters.filter(
      (c) => requiredNames.some(
        (name) => c.name.toLowerCase().includes(name.toLowerCase()) ||
                  name.toLowerCase().includes(c.name.toLowerCase())
      )
    );

    if (selectedCharacters.length === 0) {
      send(session, { type: 'error', message: 'No matching characters found for scenario' });
      return;
    }

    // Update session state
    session.scenario = toScenarioSummary(scenario);
    session.characters = selectedCharacters.map(toCharacterSummary);
    session.dialogue = [];
    session.turnCount = 0;
    session.status = 'running';
    session.pauseSignal = { paused: false };
    session.abortController = new AbortController();

    send(session, { type: 'status_change', status: 'running' });

    // Create scene executor with emitter
    const scenarioContext = {
      name: scenario.name,
      description: scenario.description,
      setting: scenario.setting,
      characters: selectedCharacters.map((c) => c.name),
      objectives: scenario.objectives,
      tone: scenario.toneGuidelines || scenario.mood,
    };

    const emitter = createSceneEmitter(session);

    // Create executor with web options
    session.executor = new SceneExecutor(selectedCharacters, scenarioContext, {
      maxTurns: 30,
      verbose: false,
      noLog: true, // Don't write file logs for web
      emitter,
      control: {
        pauseSignal: session.pauseSignal,
        abortSignal: session.abortController.signal,
      },
    });

    // Run the scene
    await session.executor.runScene(30);

  } catch (error) {
    session.status = 'error';
    send(session, { type: 'error', message: (error as Error).message });
    send(session, { type: 'status_change', status: 'error' });
  }
}

// Handle incoming client message
async function handleClientMessage(
  session: SceneSession,
  message: ClientMessage
): Promise<void> {
  switch (message.type) {
    case 'start':
      if (session.status === 'idle' || session.status === 'complete' || session.status === 'error') {
        await startScene(session, message.scenarioId, message.characterIds);
      }
      break;

    case 'pause':
      if (session.status === 'running') {
        session.pauseSignal.paused = true;
        session.status = 'paused';
        send(session, { type: 'status_change', status: 'paused' });
      }
      break;

    case 'resume':
      if (session.status === 'paused') {
        session.pauseSignal.paused = false;
        session.status = 'running';
        send(session, { type: 'status_change', status: 'running' });
      }
      break;

    case 'stop':
      if (session.status === 'running' || session.status === 'paused') {
        session.abortController.abort();
        session.pauseSignal.paused = false;
        session.status = 'complete';
        send(session, { type: 'scene_end', summary: 'Scene stopped by user' });
        send(session, { type: 'status_change', status: 'complete' });
      }
      break;
  }
}

// WebSocket handlers for Bun.serve()
export const websocketHandlers = {
  open(ws: ServerWebSocket<SessionData>): void {
    const sessionId = ws.data.sessionId;
    const session = sessions.get(sessionId);

    if (session) {
      session.client = ws;
      send(session, { type: 'connected', sessionId });
    } else {
      ws.close(4004, 'Session not found');
    }
  },

  async message(ws: ServerWebSocket<SessionData>, message: string | Buffer): Promise<void> {
    const sessionId = ws.data.sessionId;
    const session = sessions.get(sessionId);

    if (!session) {
      ws.close(4004, 'Session not found');
      return;
    }

    try {
      const data = JSON.parse(message.toString()) as ClientMessage;
      await handleClientMessage(session, data);
    } catch (error) {
      send(session, { type: 'error', message: 'Invalid message format' });
    }
  },

  close(ws: ServerWebSocket<SessionData>): void {
    const sessionId = ws.data.sessionId;
    const session = sessions.get(sessionId);

    if (session) {
      // Abort any running scene
      session.abortController.abort();
      session.client = null;

      // Clean up session after a delay
      setTimeout(() => {
        if (session.client === null) {
          sessions.delete(sessionId);
        }
      }, 60000); // Keep session for 1 minute for reconnection
    }
  },
};

// POST /api/scene - Create new session
export function handleCreateScene(): Response {
  const sessionId = createSession();
  return Response.json({ sessionId }, { status: 201 });
}

// GET /api/scene/:id - Get session state
export function handleGetScene(sessionId: string): Response {
  const session = sessions.get(sessionId);
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  return Response.json({
    sessionId: session.id,
    status: session.status,
    scenario: session.scenario,
    characters: session.characters,
    turnCount: session.turnCount,
    dialogue: session.dialogue,
  });
}

// DELETE /api/scene/:id - Stop and destroy session
export function handleDeleteScene(sessionId: string): Response {
  const session = sessions.get(sessionId);
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  session.abortController.abort();
  session.client?.close();
  sessions.delete(sessionId);

  return new Response(null, { status: 204 });
}
