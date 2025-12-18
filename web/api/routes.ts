// REST API route handlers

import { join } from 'path';
import { loadAllCharacters } from '../../src/characters/loader.js';
import { loadAllScenarios } from '../../src/scenarios/loader.js';
import { generateScenario, BUILTIN_SCENARIOS } from '../../src/scenarios/generator.js';
import type { CharacterSummary, ScenarioSummary } from '../shared/protocol.js';
import type { CharacterSheet } from '../../src/characters/types.js';
import type { Scenario } from '../../src/scenarios/types.js';

// Use CWD so server finds assets relative to where it's run
const PROJECT_ROOT = process.cwd();

// Cache loaded data
let charactersCache: CharacterSheet[] | null = null;
let scenariosCache: Scenario[] | null = null;

async function getCharacters(): Promise<CharacterSheet[]> {
  if (!charactersCache) {
    const charactersDir = join(PROJECT_ROOT, 'characters');
    charactersCache = loadAllCharacters(charactersDir);
  }
  return charactersCache;
}

async function getScenarios(): Promise<Scenario[]> {
  if (!scenariosCache) {
    const scenariosDir = join(PROJECT_ROOT, 'scenarios');
    const fileScenarios = loadAllScenarios(scenariosDir);
    // Deduplicate: prefer file scenarios over builtins
    const fileIds = new Set(fileScenarios.map(s => s.id));
    const uniqueBuiltins = BUILTIN_SCENARIOS.filter(s => !fileIds.has(s.id));
    scenariosCache = [...fileScenarios, ...uniqueBuiltins];
  }
  return scenariosCache;
}

function toCharacterSummary(char: CharacterSheet): CharacterSummary {
  return {
    name: char.name,
    shortName: char.shortName,
    color: char.color,
  };
}

function toScenarioSummary(scenario: Scenario): ScenarioSummary {
  return {
    id: scenario.id,
    name: scenario.name,
    type: scenario.type,
    mood: scenario.mood,
    requiredCharacters: scenario.requiredCharacters,
    optionalCharacters: scenario.optionalCharacters,
    setting: scenario.setting,
    description: scenario.description,
  };
}

// GET /api/characters
export async function handleGetCharacters(): Promise<Response> {
  try {
    const characters = await getCharacters();
    const summaries = characters.map(toCharacterSummary);
    return Response.json(summaries);
  } catch (error) {
    return Response.json(
      { error: 'Failed to load characters' },
      { status: 500 }
    );
  }
}

// GET /api/characters/:name
export async function handleGetCharacter(name: string): Promise<Response> {
  try {
    const characters = await getCharacters();
    const char = characters.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() ||
             c.shortName.toLowerCase() === name.toLowerCase()
    );
    if (!char) {
      return Response.json({ error: 'Character not found' }, { status: 404 });
    }
    return Response.json(char);
  } catch (error) {
    return Response.json(
      { error: 'Failed to load character' },
      { status: 500 }
    );
  }
}

// GET /api/scenarios
export async function handleGetScenarios(): Promise<Response> {
  try {
    const scenarios = await getScenarios();
    const summaries = scenarios.map(toScenarioSummary);
    return Response.json(summaries);
  } catch (error) {
    return Response.json(
      { error: 'Failed to load scenarios' },
      { status: 500 }
    );
  }
}

// GET /api/scenarios/:id
export async function handleGetScenario(id: string): Promise<Response> {
  try {
    const scenarios = await getScenarios();
    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) {
      return Response.json({ error: 'Scenario not found' }, { status: 404 });
    }
    return Response.json(scenario);
  } catch (error) {
    return Response.json(
      { error: 'Failed to load scenario' },
      { status: 500 }
    );
  }
}

// POST /api/scenarios/generate
export async function handleGenerateScenario(req: Request): Promise<Response> {
  try {
    const body = await req.json() as { type?: string; characters?: string[] };
    const characters = await getCharacters();

    const scenario = await generateScenario(
      {
        type: body.type as any,
        characters: body.characters,
      },
      characters
    );

    return Response.json(toScenarioSummary(scenario), { status: 201 });
  } catch (error) {
    return Response.json(
      { error: `Failed to generate scenario: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// Export getters for use by websocket handler
export { getCharacters, getScenarios, toCharacterSummary, toScenarioSummary };
