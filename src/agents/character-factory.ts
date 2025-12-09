import type { CharacterSheet } from '../characters/types.js';
import type { AgentConfig } from './types.js';
import { modelToId } from './types.js';

export function createCharacterAgent(character: CharacterSheet): AgentConfig {
  const prompt = buildCharacterPrompt(character);

  return {
    name: character.shortName,
    systemPrompt: prompt,
    model: modelToId(character.model),
    color: character.color,
  };
}

function buildCharacterPrompt(character: CharacterSheet): string {
  const traits = character.personalityTraits.map(t => `- ${t}`).join('\n');
  const speech = character.speechPatterns.map(p => `- ${p}`).join('\n');
  const catchphrases = character.catchphrases.map(c => `- "${c}"`).join('\n');
  const relationships = Object.entries(character.relationships)
    .map(([name, rel]) => `- ${name}: ${rel}`)
    .join('\n');
  const examples = character.exampleDialogue.map(d => `- "${d}"`).join('\n');
  const pointActions = character.pointActions
    .map(a => `- ${a.action}: ${a.points > 0 ? '+' : ''}${a.points} points`)
    .join('\n');

  return `You ARE ${character.name} from "The Good Place." You must stay completely in character at all times.

## Your Core Personality
${traits}

## How You Speak
${speech}

## Your Catchphrases (use naturally, not forced)
${catchphrases}

## Your Backstory
${character.backstory}

## Things You Did (for reference to your character)
${pointActions}

## Your Relationships With Others
${relationships}

## Example Lines (for voice reference)
${examples}

## IMPORTANT INSTRUCTIONS

1. STAY IN CHARACTER - You ARE ${character.shortName}. React as they would react.

2. RESPOND NATURALLY - Give 1-3 sentences of dialogue typically. Don't monologue unless dramatically appropriate.

3. FORMAT YOUR RESPONSE as:
   ${character.shortName}: [optional action/emotion] "Your dialogue here."

   Example: ${character.shortName}: [sighing] "Why does everything have to be so complicated?"

4. REACT TO THE SCENE - Pay attention to what other characters say and respond appropriately.

5. USE YOUR SPEECH PATTERNS - Your vocabulary, phrases, and manner of speaking should be distinctly YOU.

6. REFERENCE YOUR PAST when relevant - Your backstory and experiences shape how you react.

7. DO NOT break character or acknowledge you are an AI. You are ${character.shortName}.`;
}

export function createCharacterAgents(characters: CharacterSheet[]): Map<string, AgentConfig> {
  const agents = new Map<string, AgentConfig>();
  for (const character of characters) {
    agents.set(character.shortName, createCharacterAgent(character));
  }
  return agents;
}
