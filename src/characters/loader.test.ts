import { describe, it, expect } from 'vitest';
import { loadCharacter, getCharacterByName } from './loader.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHARACTERS_DIR = join(__dirname, '..', '..', 'characters');

describe('loadCharacter', () => {
  it('loads Eleanor character sheet', () => {
    const eleanor = loadCharacter(join(CHARACTERS_DIR, 'eleanor-shellstrop.md'));

    expect(eleanor.name).toBe('Eleanor Shellstrop');
    expect(eleanor.shortName).toBe('Eleanor');
    expect(eleanor.color).toBe('#FF6B6B');
  });

  it('parses personality traits', () => {
    const eleanor = loadCharacter(join(CHARACTERS_DIR, 'eleanor-shellstrop.md'));

    expect(eleanor.personalityTraits.length).toBeGreaterThan(0);
    expect(eleanor.personalityTraits.some(t => t.toLowerCase().includes('sarcasm'))).toBe(true);
  });

  it('parses speech patterns', () => {
    const eleanor = loadCharacter(join(CHARACTERS_DIR, 'eleanor-shellstrop.md'));

    expect(eleanor.speechPatterns.length).toBeGreaterThan(0);
  });

  it('parses catchphrases', () => {
    const eleanor = loadCharacter(join(CHARACTERS_DIR, 'eleanor-shellstrop.md'));

    expect(eleanor.catchphrases.length).toBeGreaterThan(0);
    expect(eleanor.catchphrases.some(c => c.includes('fork'))).toBe(true);
  });

  it('parses backstory', () => {
    const eleanor = loadCharacter(join(CHARACTERS_DIR, 'eleanor-shellstrop.md'));

    expect(eleanor.backstory).toContain('Phoenix');
    expect(eleanor.backstory.length).toBeGreaterThan(100);
  });

  it('parses point actions table', () => {
    const eleanor = loadCharacter(join(CHARACTERS_DIR, 'eleanor-shellstrop.md'));

    expect(eleanor.pointActions.length).toBeGreaterThan(0);

    const negativeAction = eleanor.pointActions.find(a => a.points < 0);
    expect(negativeAction).toBeDefined();

    const positiveAction = eleanor.pointActions.find(a => a.points > 0);
    expect(positiveAction).toBeDefined();
  });

  it('parses relationships', () => {
    const eleanor = loadCharacter(join(CHARACTERS_DIR, 'eleanor-shellstrop.md'));

    expect(Object.keys(eleanor.relationships).length).toBeGreaterThan(0);
    expect(eleanor.relationships['Chidi']).toBeDefined();
  });

  it('parses example dialogue', () => {
    const eleanor = loadCharacter(join(CHARACTERS_DIR, 'eleanor-shellstrop.md'));

    expect(eleanor.exampleDialogue.length).toBeGreaterThan(0);
  });
});

describe('getCharacterByName', () => {
  const mockCharacters = [
    { name: 'Eleanor Shellstrop', shortName: 'Eleanor' },
    { name: 'Chidi Anagonye', shortName: 'Chidi' },
    { name: 'Bad Janet', shortName: 'Bad Janet' },
  ] as any[];

  it('finds character by full name', () => {
    const result = getCharacterByName(mockCharacters, 'Eleanor Shellstrop');
    expect(result?.shortName).toBe('Eleanor');
  });

  it('finds character by short name', () => {
    const result = getCharacterByName(mockCharacters, 'Eleanor');
    expect(result?.name).toBe('Eleanor Shellstrop');
  });

  it('is case insensitive', () => {
    const result = getCharacterByName(mockCharacters, 'CHIDI');
    expect(result?.name).toBe('Chidi Anagonye');
  });

  it('finds two-word short names', () => {
    const result = getCharacterByName(mockCharacters, 'Bad Janet');
    expect(result?.name).toBe('Bad Janet');
  });

  it('returns undefined for unknown character', () => {
    const result = getCharacterByName(mockCharacters, 'Derek');
    expect(result).toBeUndefined();
  });
});
