import type { CharacterSheet } from '../characters/types.js';

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  model: 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514' | 'claude-3-5-haiku-20241022';
  color: string;
}

export interface OrchestratorOutput {
  type: 'scene_direction' | 'next_speaker' | 'scene_end' | 'dialogue';
  content: string;
  speaker?: string;
  context?: string;
}

export interface DialogueTurn {
  character: string;
  dialogue: string;
  action?: string;
  emotion?: string;
}

export interface SceneState {
  turnCount: number;
  characters: string[];
  recentDialogue: DialogueTurn[];
  isComplete: boolean;
  summary?: string;
}

export type ModelName = CharacterSheet['model'];

export function modelToId(model?: ModelName): AgentConfig['model'] {
  switch (model) {
    case 'opus':
      return 'claude-opus-4-20250514';
    case 'haiku':
      return 'claude-3-5-haiku-20241022';
    case 'sonnet':
    default:
      return 'claude-sonnet-4-20250514';
  }
}
