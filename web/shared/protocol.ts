// WebSocket message protocol types shared between server and client

import type { ParsedDialogue } from '../../src/simulation/dialogue-formatter.js';

// Scene status states
export type SceneStatus = 'idle' | 'running' | 'paused' | 'complete' | 'error';

// Character summary for API responses
export interface CharacterSummary {
  name: string;
  shortName: string;
  color: string;
}

// Scenario summary for API responses
export interface ScenarioSummary {
  id: string;
  name: string;
  type: string;
  mood: string;
  requiredCharacters: string[];
  optionalCharacters?: string[];
  setting: string;
  description: string;
}

// Server to Client messages
export type ServerMessage =
  | { type: 'connected'; sessionId: string }
  | { type: 'scene_start'; title: string; setting: string }
  | { type: 'scene_direction'; content: string }
  | { type: 'dialogue_start'; character: string; color: string }
  | { type: 'dialogue_chunk'; text: string }
  | { type: 'dialogue_end'; parsed: ParsedDialogue }
  | { type: 'scene_end'; summary?: string }
  | { type: 'status_change'; status: SceneStatus }
  | { type: 'error'; message: string };

// Client to Server messages
export type ClientMessage =
  | { type: 'start'; scenarioId: string; characterIds?: string[] }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' };

// Scene state exposed to client
export interface SceneState {
  sessionId: string;
  status: SceneStatus;
  scenario: ScenarioSummary | null;
  characters: CharacterSummary[];
  turnCount: number;
  dialogue: DialogueEntry[];
  summary?: string;
  error?: string;
}

// Single dialogue entry for display
export interface DialogueEntry {
  id: string;
  type: 'direction' | 'dialogue';
  timestamp: number;
  character?: string;
  color?: string;
  stageDirections?: string[];
  emotions?: string[];
  dialogue?: string;
  content?: string; // For scene directions
}
