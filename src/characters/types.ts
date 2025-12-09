export interface PointAction {
  action: string;
  points: number;
}

export interface CharacterSheet {
  // Frontmatter fields
  name: string;
  color: string;
  shortName: string;
  model?: 'sonnet' | 'opus' | 'haiku';

  // Parsed content
  personalityTraits: string[];
  speechPatterns: string[];
  catchphrases: string[];
  backstory: string;
  pointActions: PointAction[];
  relationships: Record<string, string>;
  exampleDialogue: string[];
}

export interface CharacterFrontmatter {
  name: string;
  color: string;
  shortName: string;
  model?: 'sonnet' | 'opus' | 'haiku';
}
