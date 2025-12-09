import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import type { Scenario, ScenarioFrontmatter } from './types.js';

export function loadScenario(filePath: string): Scenario {
  const content = readFileSync(filePath, 'utf-8');
  const { data, content: markdown } = matter(content);
  const frontmatter = data as ScenarioFrontmatter;

  return {
    ...frontmatter,
    description: parseSection(markdown, 'Description') || parseSection(markdown, 'Setup') || '',
    objectives: parseList(markdown, 'Objectives'),
    keyBeats: parseList(markdown, 'Key Beats'),
    toneGuidelines: parseSection(markdown, 'Tone Guidelines'),
  };
}

export function loadAllScenarios(scenariosDir: string): Scenario[] {
  if (!existsSync(scenariosDir)) {
    return [];
  }

  const files = readdirSync(scenariosDir).filter(f => f.endsWith('.md'));
  return files.map(f => loadScenario(join(scenariosDir, f)));
}

export function getScenarioById(scenarios: Scenario[], id: string): Scenario | undefined {
  return scenarios.find(s => s.id === id || s.name.toLowerCase() === id.toLowerCase());
}

export function getRandomScenario(scenarios: Scenario[]): Scenario | undefined {
  if (scenarios.length === 0) return undefined;
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

function parseSection(markdown: string, sectionName: string): string {
  const regex = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = markdown.match(regex);
  if (!match) return '';
  return match[1].trim();
}

function parseList(markdown: string, sectionName: string): string[] {
  const section = parseSection(markdown, sectionName);
  if (!section) return [];

  const lines = section.split('\n');
  return lines
    .filter(line => line.trim().match(/^[\d\-\*\.]+/))
    .map(line => line.replace(/^[\d\-\*\.]+\s*/, '').trim())
    .filter(line => line.length > 0);
}
