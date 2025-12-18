import { createRoot } from 'react-dom/client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ServerMessage,
  ClientMessage,
  SceneStatus,
  CharacterSummary,
  ScenarioSummary,
  DialogueEntry,
} from '../shared/protocol.js';

// ============================================
// Types
// ============================================

interface AppState {
  // Connection
  isConnected: boolean;
  sessionId: string | null;

  // Data
  characters: CharacterSummary[];
  scenarios: ScenarioSummary[];

  // Scene state
  status: SceneStatus;
  selectedScenarioId: string | null;
  sceneTitle: string;
  sceneSetting: string;
  dialogue: DialogueEntry[];
  streamingText: string;
  currentSpeaker: string | null;

  // UI
  error: string | null;
  isLoading: boolean;
}

// ============================================
// Hooks
// ============================================

function useWebSocket(sessionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback((sid: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws?sessionId=${sid}`);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    wsRef.current = ws;
    return ws;
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { ws: wsRef, isConnected, connect, disconnect, send };
}

// ============================================
// Components
// ============================================

function CloudBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Large background clouds */}
      <div className="cloud animate-float-slow" style={{ width: '600px', height: '200px', top: '10%', left: '-5%', opacity: 0.4 }} />
      <div className="cloud animate-float" style={{ width: '800px', height: '250px', top: '30%', right: '-10%', opacity: 0.3 }} />
      <div className="cloud animate-float-slow" style={{ width: '500px', height: '180px', bottom: '20%', left: '10%', opacity: 0.35 }} />
      <div className="cloud animate-float" style={{ width: '700px', height: '220px', bottom: '5%', right: '5%', opacity: 0.25 }} />
    </div>
  );
}

function Header({ isConnected }: { isConnected: boolean }) {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-white/50 px-6 py-4 flex items-center justify-between relative z-10">
      <h1 className="font-display text-2xl font-bold text-gray-800">
        The Good Place <span className="text-[var(--gp-sky-500)]">Simulator</span>
      </h1>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className={`status-dot ${isConnected ? 'status-connected' : 'status-disconnected'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </header>
  );
}

function ScenarioSelector({
  scenarios,
  selectedId,
  onSelect,
  disabled,
}: {
  scenarios: ScenarioSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-white/90 rounded-xl p-4 shadow-sm">
      <h2 className="font-semibold text-gray-700 mb-3">Scenarios</h2>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario.id)}
            disabled={disabled}
            className={`w-full text-left p-3 rounded-lg transition-all ${
              selectedId === scenario.id
                ? 'bg-[var(--gp-sky-400)] text-white shadow-md'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="font-medium text-sm">{scenario.name}</div>
            <div className={`text-xs mt-1 ${selectedId === scenario.id ? 'text-white/80' : 'text-gray-500'}`}>
              {scenario.mood} &bull; {scenario.requiredCharacters.length} characters
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CharacterRoster({ characters }: { characters: CharacterSummary[] }) {
  return (
    <div className="bg-white/90 rounded-xl p-4 shadow-sm">
      <h2 className="font-semibold text-gray-700 mb-3">Characters</h2>
      <div className="grid grid-cols-2 gap-2">
        {characters.map((char) => (
          <div
            key={char.name}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: char.color }}
            />
            <span className="text-sm text-gray-700 truncate">{char.shortName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DialogueLine({ entry }: { entry: DialogueEntry }) {
  if (entry.type === 'direction') {
    return (
      <div className="scene-direction p-4 my-4 text-center animate-fade-in">
        {entry.content}
      </div>
    );
  }

  return (
    <div
      className="dialogue-card p-4 my-3 animate-fade-in"
      style={{ borderLeftColor: entry.color }}
    >
      <div className="font-semibold mb-1" style={{ color: entry.color }}>
        {entry.character}
      </div>
      {(entry.stageDirections?.length || entry.emotions?.length) && (
        <div className="text-sm text-gray-500 italic mb-2">
          {[...(entry.stageDirections || []), ...(entry.emotions || [])].join(' ')}
        </div>
      )}
      {entry.dialogue && (
        <div className="text-gray-800">&ldquo;{entry.dialogue}&rdquo;</div>
      )}
    </div>
  );
}

function SceneViewer({
  title,
  setting,
  dialogue,
  streamingText,
  currentSpeaker,
}: {
  title: string;
  setting: string;
  dialogue: DialogueEntry[];
  streamingText: string;
  currentSpeaker: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new dialogue
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [dialogue, streamingText]);

  if (!title && dialogue.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">&#x2601;</div>
          <div>Select a scenario and click Play to begin</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Scene header */}
      {title && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-gray-800">{title}</h2>
          {setting && <p className="text-sm text-gray-600 mt-1">{setting}</p>}
        </div>
      )}

      {/* Dialogue container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-2"
      >
        {dialogue.map((entry) => (
          <DialogueLine key={entry.id} entry={entry} />
        ))}

        {/* Streaming indicator */}
        {currentSpeaker && (
          <div className="dialogue-card p-4 my-3 opacity-70">
            <div className="font-semibold mb-1 text-gray-600">
              {currentSpeaker}
            </div>
            <div className="text-gray-600">
              {streamingText || <span className="animate-pulse">...</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Controls({
  status,
  selectedScenarioId,
  onPlay,
  onPause,
  onResume,
  onStop,
}: {
  status: SceneStatus;
  selectedScenarioId: string | null;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const canPlay = (status === 'idle' || status === 'complete' || status === 'error') && selectedScenarioId;
  const canPause = status === 'running';
  const canResume = status === 'paused';
  const canStop = status === 'running' || status === 'paused';

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-sm flex items-center justify-center gap-4">
      {(status === 'idle' || status === 'complete' || status === 'error') && (
        <button
          onClick={onPlay}
          disabled={!canPlay}
          className="control-btn control-btn-primary"
        >
          &#9658; Play
        </button>
      )}

      {status === 'running' && (
        <button
          onClick={onPause}
          disabled={!canPause}
          className="control-btn control-btn-secondary"
        >
          &#10074;&#10074; Pause
        </button>
      )}

      {status === 'paused' && (
        <button
          onClick={onResume}
          disabled={!canResume}
          className="control-btn control-btn-primary"
        >
          &#9658; Resume
        </button>
      )}

      {(status === 'running' || status === 'paused') && (
        <button
          onClick={onStop}
          disabled={!canStop}
          className="control-btn control-btn-secondary"
        >
          &#9632; Stop
        </button>
      )}

      {status === 'running' && (
        <span className="text-sm text-gray-500 animate-pulse">Scene in progress...</span>
      )}
      {status === 'paused' && (
        <span className="text-sm text-gray-500">Scene paused</span>
      )}
    </div>
  );
}

// ============================================
// Main App
// ============================================

function App() {
  const [state, setState] = useState<AppState>({
    isConnected: false,
    sessionId: null,
    characters: [],
    scenarios: [],
    status: 'idle',
    selectedScenarioId: null,
    sceneTitle: '',
    sceneSetting: '',
    dialogue: [],
    streamingText: '',
    currentSpeaker: null,
    error: null,
    isLoading: true,
  });

  const { ws, isConnected, connect, send } = useWebSocket(state.sessionId);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [charsRes, scenariosRes] = await Promise.all([
          fetch('/api/characters'),
          fetch('/api/scenarios'),
        ]);

        const characters = await charsRes.json();
        const scenarios = await scenariosRes.json();

        setState((s) => ({
          ...s,
          characters,
          scenarios,
          isLoading: false,
        }));
      } catch (error) {
        setState((s) => ({
          ...s,
          error: 'Failed to load data',
          isLoading: false,
        }));
      }
    }

    loadData();
  }, []);

  // Create session on mount
  useEffect(() => {
    async function createSession() {
      try {
        const res = await fetch('/api/scene', { method: 'POST' });
        const { sessionId } = await res.json();
        setState((s) => ({ ...s, sessionId }));
      } catch (error) {
        setState((s) => ({ ...s, error: 'Failed to create session' }));
      }
    }

    createSession();
  }, []);

  // Connect WebSocket when session is ready
  useEffect(() => {
    if (state.sessionId && !isConnected) {
      const websocket = connect(state.sessionId);

      if (websocket) {
        websocket.onmessage = (event) => {
          const message: ServerMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              setState((s) => ({ ...s, isConnected: true }));
              break;

            case 'scene_start':
              setState((s) => ({
                ...s,
                sceneTitle: message.title,
                sceneSetting: message.setting,
                dialogue: [],
              }));
              break;

            case 'scene_direction':
              setState((s) => ({
                ...s,
                dialogue: [
                  ...s.dialogue,
                  {
                    id: `dir-${Date.now()}`,
                    type: 'direction',
                    timestamp: Date.now(),
                    content: message.content,
                  },
                ],
              }));
              break;

            case 'dialogue_start':
              setState((s) => ({
                ...s,
                currentSpeaker: message.character,
                streamingText: '',
              }));
              break;

            case 'dialogue_chunk':
              setState((s) => ({
                ...s,
                streamingText: s.streamingText + message.text,
              }));
              break;

            case 'dialogue_end':
              setState((s) => ({
                ...s,
                currentSpeaker: null,
                streamingText: '',
                dialogue: [
                  ...s.dialogue,
                  {
                    id: `dlg-${Date.now()}`,
                    type: 'dialogue',
                    timestamp: Date.now(),
                    character: message.parsed.characterName || 'Unknown',
                    color: state.characters.find(
                      (c) => c.name === message.parsed.characterName
                    )?.color || '#666',
                    stageDirections: message.parsed.stageDirections,
                    emotions: message.parsed.emotions,
                    dialogue: message.parsed.dialogue,
                  },
                ],
              }));
              break;

            case 'scene_end':
              setState((s) => ({
                ...s,
                status: 'complete',
                currentSpeaker: null,
                streamingText: '',
              }));
              break;

            case 'status_change':
              setState((s) => ({ ...s, status: message.status }));
              break;

            case 'error':
              setState((s) => ({ ...s, error: message.message }));
              break;
          }
        };
      }
    }

    return () => {
      // Cleanup handled by useWebSocket
    };
  }, [state.sessionId, isConnected, connect, state.characters]);

  // Update connection status
  useEffect(() => {
    setState((s) => ({ ...s, isConnected }));
  }, [isConnected]);

  // Handlers
  const handleSelectScenario = (id: string) => {
    setState((s) => ({ ...s, selectedScenarioId: id }));
  };

  const handlePlay = () => {
    if (state.selectedScenarioId) {
      setState((s) => ({
        ...s,
        dialogue: [],
        sceneTitle: '',
        sceneSetting: '',
        error: null,
      }));
      send({ type: 'start', scenarioId: state.selectedScenarioId });
    }
  };

  const handlePause = () => {
    send({ type: 'pause' });
  };

  const handleResume = () => {
    send({ type: 'resume' });
  };

  const handleStop = () => {
    send({ type: 'stop' });
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <CloudBackground />

      <Header isConnected={state.isConnected} />

      <main className="flex-1 flex gap-6 p-6 relative z-10">
        {/* Sidebar */}
        <aside className="w-72 flex flex-col gap-4 flex-shrink-0">
          <ScenarioSelector
            scenarios={state.scenarios}
            selectedId={state.selectedScenarioId}
            onSelect={handleSelectScenario}
            disabled={state.status === 'running' || state.status === 'paused'}
          />
          <CharacterRoster characters={state.characters} />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-4">
          {state.error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
              {state.error}
            </div>
          )}

          <SceneViewer
            title={state.sceneTitle}
            setting={state.sceneSetting}
            dialogue={state.dialogue}
            streamingText={state.streamingText}
            currentSpeaker={state.currentSpeaker}
          />

          <Controls
            status={state.status}
            selectedScenarioId={state.selectedScenarioId}
            onPlay={handlePlay}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStop}
          />
        </div>
      </main>
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
