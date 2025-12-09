import { describe, it, expect } from 'vitest';
import { parseOrchestratorOutput } from './orchestrator.js';

describe('parseOrchestratorOutput', () => {
  describe('scene directions', () => {
    it('parses [SCENE] tag', () => {
      const result = parseOrchestratorOutput('[SCENE]: The sun sets over the neighborhood.');
      expect(result.type).toBe('scene');
      expect(result.content).toBe('The sun sets over the neighborhood.');
    });

    it('parses [SCENE] without colon', () => {
      const result = parseOrchestratorOutput('[SCENE] Eleanor walks into the frozen yogurt shop.');
      expect(result.type).toBe('scene');
      expect(result.content).toBe('Eleanor walks into the frozen yogurt shop.');
    });

    it('treats untagged text as scene description', () => {
      const result = parseOrchestratorOutput('The group gathers in the town square.');
      expect(result.type).toBe('scene');
      expect(result.content).toBe('The group gathers in the town square.');
    });
  });

  describe('next speaker', () => {
    it('parses [NEXT] with character name', () => {
      const result = parseOrchestratorOutput('[NEXT]: Eleanor');
      expect(result.type).toBe('next');
      if (result.type === 'next') {
        expect(result.speaker).toBe('Eleanor');
      }
    });

    it('parses [NEXT] with two-word character name', () => {
      const result = parseOrchestratorOutput('[NEXT]: Bad Janet');
      expect(result.type).toBe('next');
      if (result.type === 'next') {
        expect(result.speaker).toBe('Bad Janet');
      }
    });

    it('parses [NEXT] with [CONTEXT]', () => {
      const result = parseOrchestratorOutput('[NEXT]: Chidi\n[CONTEXT]: Respond to Eleanor\'s ethical dilemma');
      expect(result.type).toBe('next');
      if (result.type === 'next') {
        expect(result.speaker).toBe('Chidi');
        expect(result.context).toContain('ethical dilemma');
      }
    });

    it('parses context without colon after tag', () => {
      const result = parseOrchestratorOutput('[NEXT] Jason\n[CONTEXT] He should suggest a Molotov cocktail');
      expect(result.type).toBe('next');
      if (result.type === 'next') {
        expect(result.speaker).toBe('Jason');
        expect(result.context).toContain('Molotov');
      }
    });
  });

  describe('scene end', () => {
    it('parses [END] alone', () => {
      const result = parseOrchestratorOutput('[END]');
      expect(result.type).toBe('end');
      expect(result.content).toBe('Scene ended');
    });

    it('parses [END] with [BUTTON]', () => {
      const result = parseOrchestratorOutput('[END]\n[BUTTON]: Everyone freezes in shock.');
      expect(result.type).toBe('end');
      if (result.type === 'end') {
        expect(result.button).toBe('Everyone freezes in shock.');
      }
    });

    it('parses [END] with [BUTTON] and [SUMMARY]', () => {
      const result = parseOrchestratorOutput(
        '[END]\n[BUTTON]: Eleanor hugs Chidi.\n[SUMMARY]: The gang learned that friendship is more important than frozen yogurt.'
      );
      expect(result.type).toBe('end');
      if (result.type === 'end') {
        expect(result.button).toBe('Eleanor hugs Chidi.');
        expect(result.summary).toContain('friendship');
      }
    });

    it('detects [END] anywhere in output', () => {
      const result = parseOrchestratorOutput('Some preamble text\n[END]\n[SUMMARY]: It was fine.');
      expect(result.type).toBe('end');
      if (result.type === 'end') {
        expect(result.summary).toBe('It was fine.');
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = parseOrchestratorOutput('');
      expect(result.type).toBe('scene');
      expect(result.content).toBe('');
    });

    it('handles multiline scene descriptions', () => {
      const result = parseOrchestratorOutput('[SCENE]: The neighborhood is bustling with activity.\nPeople walk by eating frozen yogurt.');
      expect(result.type).toBe('scene');
      expect(result.content).toContain('bustling');
    });

    it('prefers [END] over other tags', () => {
      const result = parseOrchestratorOutput('[SCENE]: Something happens\n[END]\n[BUTTON]: Done');
      expect(result.type).toBe('end');
    });
  });
});
