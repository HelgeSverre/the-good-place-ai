import Anthropic from '@anthropic-ai/sdk';
import type { Scenario, ScenarioType, ScenarioMood, ScenarioGeneratorOptions } from './types.js';

const SCENARIO_TEMPLATES: Record<ScenarioType, string> = {
  ethical_dilemma: `Create a scenario involving a moral dilemma that Chidi would agonize over.
    It should be absurd enough to be funny but have genuine philosophical depth.
    Examples: trolley problem variations, lying to protect someone, choosing between friends.`,

  neighborhood_chaos: `Create a scenario where something goes wrong in the neighborhood.
    It could be a Janet malfunction, a neighborhood event disaster, or unexpected visitors.
    The chaos should reveal character dynamics.`,

  demon_scheme: `Create a scenario involving The Bad Place trying to interfere.
    Shawn or Bad Janet could be scheming, or there could be a reveal about the neighborhood.
    Balance threat with comedy.`,

  social_gathering: `Create a scenario around a social event or gathering.
    A party, dinner, game night, or class taught by Chidi.
    Focus on character interactions and comedy.`,

  character_study: `Create a scenario that focuses on one character's backstory or growth.
    Others react and help (or hinder). Emotional moments balanced with humor.`
};

export async function generateScenario(
  options: ScenarioGeneratorOptions = {},
  availableCharacters: string[] = []
): Promise<Scenario> {
  const client = new Anthropic();

  const type = options.type || randomScenarioType();
  const mood = options.mood || randomMood();
  const template = SCENARIO_TEMPLATES[type];

  const characterContext = availableCharacters.length > 0
    ? `Available characters: ${availableCharacters.join(', ')}`
    : 'Characters: Eleanor, Chidi, Tahani, Jason, Michael, Janet, Shawn, Bad Janet';

  const prompt = `You are creating a scenario for "The Good Place" TV show simulation.

${template}

${characterContext}

${options.characters ? `Must include these characters: ${options.characters.join(', ')}` : ''}

Mood: ${mood}

Generate a scenario in this exact JSON format (no markdown, just JSON):
{
  "id": "kebab-case-id",
  "name": "Scenario Title",
  "type": "${type}",
  "requiredCharacters": ["Character1", "Character2"],
  "optionalCharacters": ["Character3"],
  "setting": "Where this takes place",
  "mood": "${mood}",
  "description": "2-3 sentences describing the setup",
  "objectives": ["Goal 1", "Goal 2", "Goal 3"],
  "keyBeats": ["Beat 1", "Beat 2", "Beat 3"]
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  const text = content.type === 'text' ? content.text : '';

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to generate scenario: no JSON found in response');
  }

  const scenario = JSON.parse(jsonMatch[0]) as Scenario;
  return scenario;
}

function randomScenarioType(): ScenarioType {
  const types: ScenarioType[] = ['ethical_dilemma', 'neighborhood_chaos', 'demon_scheme', 'social_gathering', 'character_study'];
  return types[Math.floor(Math.random() * types.length)];
}

function randomMood(): ScenarioMood {
  const moods: ScenarioMood[] = ['comedic', 'philosophical', 'dramatic', 'chaotic', 'heartfelt'];
  return moods[Math.floor(Math.random() * moods.length)];
}

// Built-in scenarios for when generation isn't desired
export const BUILTIN_SCENARIOS: Scenario[] = [
  {
    id: 'trolley-problem-redux',
    name: 'The Trolley Problem Redux',
    type: 'ethical_dilemma',
    requiredCharacters: ['Eleanor', 'Chidi'],
    optionalCharacters: ['Michael', 'Tahani', 'Jason'],
    setting: 'Neighborhood Town Square',
    mood: 'comedic',
    description: 'Michael has created a REAL trolley problem in the neighborhood as a "teaching moment." There\'s an actual trolley heading toward five Janet-bots, and Chidi must decide whether to pull a lever to divert it.',
    objectives: [
      'Explore the trolley problem from multiple character perspectives',
      'Create comedy from Chidi\'s indecision',
      'Allow Eleanor to cut through the philosophy with practical solutions'
    ],
    keyBeats: [
      'Chidi discovers the situation and freezes',
      'Eleanor tries to help but makes it worse',
      'Michael defends his "educational" approach',
      'Unexpected resolution reveals character growth'
    ]
  },
  {
    id: 'janets-dinner-party',
    name: 'Janet\'s Dinner Party',
    type: 'social_gathering',
    requiredCharacters: ['Janet', 'Jason', 'Eleanor'],
    optionalCharacters: ['Tahani', 'Chidi', 'Michael'],
    setting: 'Janet\'s Void (decorated for a party)',
    mood: 'chaotic',
    description: 'Janet has decided to throw her first ever dinner party to practice human social customs. Unfortunately, she\'s taken inspiration from multiple cultures and centuries simultaneously.',
    objectives: [
      'Janet misunderstands human party conventions in hilarious ways',
      'Jason is enthusiastic but unhelpful',
      'Eleanor tries to salvage the situation'
    ],
    keyBeats: [
      'Janet reveals the bizarre party setup',
      'Guests try to navigate impossible party games',
      'Food situation becomes increasingly strange',
      'Sweet moment about friendship despite chaos'
    ]
  },
  {
    id: 'shawns-audit',
    name: 'Shawn\'s Surprise Audit',
    type: 'demon_scheme',
    requiredCharacters: ['Shawn', 'Michael', 'Eleanor'],
    optionalCharacters: ['Bad Janet', 'Chidi', 'Tahani'],
    setting: 'Michael\'s Office',
    mood: 'dramatic',
    description: 'Shawn arrives for an unannounced audit of the neighborhood. The humans must pretend everything is normal while Michael tries to keep Shawn distracted.',
    objectives: [
      'Build tension as Shawn gets suspicious',
      'Comedy from the humans\' terrible acting',
      'Michael\'s loyalty to his friends is tested'
    ],
    keyBeats: [
      'Shawn arrives unexpectedly',
      'Increasingly desperate cover-up attempts',
      'Someone almost blows the secret',
      'Clever resolution that shows growth'
    ]
  }
];
