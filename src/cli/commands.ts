import { Command } from 'commander';
import { resolve } from 'path';
import { loadAllCharacters, getCharacterByName } from '../characters/loader.js';
import { loadAllScenarios, getScenarioById, getRandomScenario } from '../scenarios/loader.js';
import { generateScenario, BUILTIN_SCENARIOS } from '../scenarios/generator.js';
import { SceneExecutor } from '../simulation/scene.js';
import { streamer } from '../simulation/dialogue-stream.js';
import type { ScenarioContext } from '../agents/orchestrator.js';
import type { CharacterSheet } from '../characters/types.js';
import type { Scenario, ScenarioType } from '../scenarios/types.js';

// Use CWD so compiled binary finds assets relative to where it's run
const PROJECT_ROOT = process.cwd();

export function createCLI(): Command {
  const program = new Command();

  program
    .name('the-good-place')
    .description('AI simulator for The Good Place characters')
    .version('1.0.0');

  program
    .option('-s, --scenario <name>', 'Use a specific scenario by id or name')
    .option('-c, --characters <names>', 'Comma-separated character names to include')
    .option('-g, --generate', 'Generate a new random scenario')
    .option('-t, --type <type>', 'Scenario type for generation (ethical_dilemma, neighborhood_chaos, demon_scheme, social_gathering, character_study)')
    .option('-m, --max-turns <number>', 'Maximum conversation turns', '30')
    .option('-v, --verbose', 'Show detailed debug output')
    .option('-l, --list <type>', 'List available scenarios or characters')
    .option('--no-log', 'Disable saving conversation log to file')
    .action(async (options) => {
      await runSimulation(options);
    });

  return program;
}

interface CLIOptions {
  scenario?: string;
  characters?: string;
  generate?: boolean;
  type?: string;
  maxTurns?: string;
  verbose?: boolean;
  list?: string;
  log?: boolean;  // commander uses 'log' for --no-log (negated)
}

const VALID_SCENARIO_TYPES = ['ethical_dilemma', 'neighborhood_chaos', 'demon_scheme', 'social_gathering', 'character_study'] as const;

async function runSimulation(options: CLIOptions): Promise<void> {
  // Validate API key early (skip for --list commands)
  if (!options.list && !process.env.ANTHROPIC_API_KEY) {
    streamer.printError('Missing ANTHROPIC_API_KEY environment variable');
    streamer.printInfo('Copy .env.example to .env and add your API key');
    streamer.printInfo('Get your key at: https://console.anthropic.com');
    return;
  }

  // Validate scenario type if provided
  if (options.type && !VALID_SCENARIO_TYPES.includes(options.type as any)) {
    streamer.printError(`Invalid scenario type: ${options.type}`);
    streamer.printInfo(`Valid types: ${VALID_SCENARIO_TYPES.join(', ')}`);
    return;
  }

  // Load all characters
  const charactersDir = resolve(PROJECT_ROOT, 'characters');
  const allCharacters = loadAllCharacters(charactersDir);

  // Handle --list option
  if (options.list) {
    if (options.list === 'characters') {
      streamer.printTitle('Available Characters');
      for (const char of allCharacters) {
        console.log(`  - ${char.name} (${char.shortName})`);
      }
      return;
    }
    if (options.list === 'scenarios') {
      const scenariosDir = resolve(PROJECT_ROOT, 'scenarios');
      const fileScenarios = loadAllScenarios(scenariosDir);
      // Deduplicate: prefer file scenarios over builtins
      const fileIds = new Set(fileScenarios.map(s => s.id));
      const uniqueBuiltins = BUILTIN_SCENARIOS.filter(s => !fileIds.has(s.id));
      const allScenarios = [...fileScenarios, ...uniqueBuiltins];

      streamer.printTitle('Available Scenarios');
      for (const scenario of allScenarios) {
        console.log(`  - ${scenario.id}: ${scenario.name} (${scenario.type})`);
        console.log(`    Characters: ${scenario.requiredCharacters.join(', ')}`);
      }
      return;
    }
    streamer.printError('Unknown list type. Use "characters" or "scenarios"');
    return;
  }

  // Get or generate scenario
  let scenario: Scenario;

  if (options.generate) {
    streamer.printInfo('Generating a new scenario...');
    const characterNames = allCharacters.map(c => c.shortName);
    try {
      scenario = await generateScenario(
        {
          type: options.type as ScenarioType | undefined,
          characters: options.characters?.split(',').map(s => s.trim()),
        },
        characterNames
      );
      streamer.printInfo(`Generated: ${scenario.name}`);
    } catch (error) {
      streamer.printError(`Failed to generate scenario: ${(error as Error).message}`);
      return;
    }
  } else if (options.scenario) {
    const scenariosDir = resolve(PROJECT_ROOT, 'scenarios');
    const fileScenarios = loadAllScenarios(scenariosDir);
    const fileIds = new Set(fileScenarios.map(s => s.id));
    const uniqueBuiltins = BUILTIN_SCENARIOS.filter(s => !fileIds.has(s.id));
    const allScenarios = [...fileScenarios, ...uniqueBuiltins];

    const found = getScenarioById(allScenarios, options.scenario);
    if (!found) {
      streamer.printError(`Scenario not found: ${options.scenario}`);
      streamer.printInfo('Use --list scenarios to see available scenarios');
      return;
    }
    scenario = found;
  } else {
    // Use a random scenario from builtins or files
    const scenariosDir = resolve(PROJECT_ROOT, 'scenarios');
    const fileScenarios = loadAllScenarios(scenariosDir);
    const fileIds = new Set(fileScenarios.map(s => s.id));
    const uniqueBuiltins = BUILTIN_SCENARIOS.filter(s => !fileIds.has(s.id));
    const allScenarios = [...fileScenarios, ...uniqueBuiltins];

    const random = getRandomScenario(allScenarios);
    if (!random) {
      streamer.printError('No scenarios available');
      return;
    }
    scenario = random;
    streamer.printInfo(`Selected scenario: ${scenario.name}`);
  }

  // Determine which characters to use
  let selectedCharacters: CharacterSheet[];

  if (options.characters) {
    const names = options.characters.split(',').map(s => s.trim());
    selectedCharacters = names
      .map(name => getCharacterByName(allCharacters, name))
      .filter((c): c is CharacterSheet => c !== undefined);

    if (selectedCharacters.length === 0) {
      streamer.printError('No valid characters found');
      streamer.printInfo('Use --list characters to see available characters');
      return;
    }
  } else {
    // Use required + optional characters from scenario
    const requiredNames = scenario.requiredCharacters;
    const optionalNames = scenario.optionalCharacters || [];

    selectedCharacters = [...requiredNames, ...optionalNames]
      .map(name => getCharacterByName(allCharacters, name))
      .filter((c): c is CharacterSheet => c !== undefined);

    if (selectedCharacters.length === 0) {
      // Fallback to first 4 characters
      selectedCharacters = allCharacters.slice(0, 4);
    }
  }

  streamer.printInfo(`Characters: ${selectedCharacters.map(c => c.shortName).join(', ')}`);

  // Build scenario context for orchestrator
  const scenarioContext: ScenarioContext = {
    name: scenario.name,
    description: scenario.description,
    setting: scenario.setting,
    characters: selectedCharacters.map(c => c.shortName),
    objectives: scenario.objectives,
    tone: scenario.mood,
  };

  // Create and run the scene
  const maxTurns = parseInt(options.maxTurns || '30', 10);
  const executor = new SceneExecutor(selectedCharacters, scenarioContext, {
    maxTurns,
    verbose: options.verbose,
    noLog: options.log === false,  // --no-log sets log to false
  });

  try {
    await executor.runScene(maxTurns);
  } catch (error) {
    if (error instanceof Error) {
      streamer.printError(error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
    }
  }
}
