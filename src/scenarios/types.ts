export type ScenarioType =
  | 'ethical_dilemma'
  | 'neighborhood_chaos'
  | 'demon_scheme'
  | 'social_gathering'
  | 'character_study';

export type ScenarioMood =
  | 'comedic'
  | 'philosophical'
  | 'dramatic'
  | 'chaotic'
  | 'heartfelt';

export interface ScenarioFrontmatter {
  id: string;
  name: string;
  type: ScenarioType;
  requiredCharacters: string[];
  optionalCharacters?: string[];
  setting: string;
  mood: ScenarioMood;
  estimatedTurns?: number;
}

export interface Scenario extends ScenarioFrontmatter {
  description: string;
  objectives: string[];
  keyBeats?: string[];
  toneGuidelines?: string;
}

export interface ScenarioGeneratorOptions {
  type?: ScenarioType;
  characters?: string[];
  mood?: ScenarioMood;
}
