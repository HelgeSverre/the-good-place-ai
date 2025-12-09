import { describe, it, expect } from 'vitest';
import { parseDialogue, getCombinedAction } from './dialogue-formatter.js';

describe('parseDialogue', () => {
  describe('basic dialogue', () => {
    it('parses plain dialogue in quotes', () => {
      const result = parseDialogue('"Hello there!"', 'Eleanor');
      expect(result.dialogue).toBe('Hello there!');
      expect(result.characterName).toBe('Eleanor');
    });

    it('parses dialogue without quotes', () => {
      const result = parseDialogue('Hello there!', 'Chidi');
      expect(result.dialogue).toBe('Hello there!');
    });

    it('removes character name prefix', () => {
      const result = parseDialogue('Eleanor: "What the fork?"', 'Eleanor');
      expect(result.characterName).toBe('Eleanor');
      expect(result.dialogue).toBe('What the fork?');
    });
  });

  describe('stage directions in brackets', () => {
    it('extracts single stage direction', () => {
      const result = parseDialogue('[sighing] "Fine, whatever."', 'Eleanor');
      expect(result.stageDirections).toContain('sighing');
      expect(result.dialogue).toBe('Fine, whatever.');
    });

    it('extracts multiple stage directions', () => {
      const result = parseDialogue('[standing up] [crossing arms] "I disagree."', 'Tahani');
      expect(result.stageDirections).toHaveLength(2);
      expect(result.stageDirections).toContain('standing up');
      expect(result.stageDirections).toContain('crossing arms');
    });

    it('handles complex stage directions', () => {
      const result = parseDialogue('[rolling eyes dramatically] "Ya basic."', 'Eleanor');
      expect(result.stageDirections).toContain('rolling eyes dramatically');
    });
  });

  describe('emotions in asterisks', () => {
    it('extracts single emotion', () => {
      const result = parseDialogue('*nervously* "Um, hi."', 'Chidi');
      expect(result.emotions).toContain('nervously');
      expect(result.dialogue).toBe('Um, hi.');
    });

    it('extracts multiple emotions', () => {
      const result = parseDialogue('*excited* *jumping* "Jacksonville!"', 'Jason');
      expect(result.emotions).toHaveLength(2);
      expect(result.emotions).toContain('excited');
      expect(result.emotions).toContain('jumping');
    });
  });

  describe('combined formats', () => {
    it('handles brackets and asterisks together', () => {
      const result = parseDialogue('[leaning forward] *whispering* "I have a secret."', 'Janet');
      expect(result.stageDirections).toContain('leaning forward');
      expect(result.emotions).toContain('whispering');
      expect(result.dialogue).toBe('I have a secret.');
    });

    it('handles character name with stage direction', () => {
      const result = parseDialogue('Michael: [thoughtfully] "Interesting."', 'Michael');
      expect(result.characterName).toBe('Michael');
      expect(result.stageDirections).toContain('thoughtfully');
      expect(result.dialogue).toBe('Interesting.');
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = parseDialogue('', 'Eleanor');
      expect(result.dialogue).toBe('');
      expect(result.stageDirections).toHaveLength(0);
      expect(result.emotions).toHaveLength(0);
    });

    it('handles only stage direction', () => {
      const result = parseDialogue('[stares blankly]', 'Janet');
      expect(result.stageDirections).toContain('stares blankly');
      expect(result.dialogue).toBe('');
    });

    it('preserves raw input', () => {
      const input = 'Eleanor: [laughing] "Holy motherforking shirtballs!"';
      const result = parseDialogue(input, 'Eleanor');
      expect(result.raw).toBe(input);
    });
  });
});

describe('getCombinedAction', () => {
  it('combines stage directions and emotions', () => {
    const parsed = parseDialogue('[waving] *excitedly* "Hello!"', 'Jason');
    const action = getCombinedAction(parsed);
    expect(action).toContain('waving');
    expect(action).toContain('excitedly');
  });

  it('returns null when no actions', () => {
    const parsed = parseDialogue('"Just dialogue."', 'Eleanor');
    const action = getCombinedAction(parsed);
    expect(action).toBeNull();
  });

  it('handles only stage directions', () => {
    const parsed = parseDialogue('[nodding] "Yes."', 'Chidi');
    const action = getCombinedAction(parsed);
    expect(action).toBe('nodding');
  });

  it('handles only emotions', () => {
    const parsed = parseDialogue('*sadly* "Goodbye."', 'Tahani');
    const action = getCombinedAction(parsed);
    expect(action).toBe('sadly');
  });
});
