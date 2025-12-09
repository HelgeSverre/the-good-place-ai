import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import type { CharacterSheet, CharacterFrontmatter, PointAction } from './types.js';

export function loadCharacter(filePath: string): CharacterSheet {
  const content = readFileSync(filePath, 'utf-8');
  const { data, content: markdown } = matter(content);
  const frontmatter = data as CharacterFrontmatter;

  return {
    name: frontmatter.name,
    color: frontmatter.color,
    shortName: frontmatter.shortName,
    model: frontmatter.model,
    personalityTraits: parseSection(markdown, 'Personality Traits'),
    speechPatterns: parseSection(markdown, 'Speech Patterns'),
    catchphrases: parseSection(markdown, 'Catchphrases'),
    backstory: parseTextSection(markdown, 'Backstory'),
    pointActions: parsePointTable(markdown),
    relationships: parseRelationships(markdown),
    exampleDialogue: parseSection(markdown, 'Example Dialogue'),
  };
}

export function loadAllCharacters(charactersDir: string): CharacterSheet[] {
  const files = readdirSync(charactersDir).filter(f => f.endsWith('.md'));
  return files.map(f => loadCharacter(join(charactersDir, f)));
}

export function getCharacterByName(characters: CharacterSheet[], name: string): CharacterSheet | undefined {
  return characters.find(c =>
    c.name.toLowerCase() === name.toLowerCase() ||
    c.shortName.toLowerCase() === name.toLowerCase()
  );
}

function parseSection(markdown: string, sectionName: string): string[] {
  const regex = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = markdown.match(regex);
  if (!match) return [];

  const lines = match[1].trim().split('\n');
  return lines
    .filter(line => line.startsWith('-'))
    .map(line => line.replace(/^-\s*/, '').replace(/^["']|["']$/g, '').trim());
}

function parseTextSection(markdown: string, sectionName: string): string {
  const regex = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = markdown.match(regex);
  if (!match) return '';
  return match[1].trim();
}

function parsePointTable(markdown: string): PointAction[] {
  const regex = /## Point System Actions\n([\s\S]*?)(?=\n## |$)/i;
  const match = markdown.match(regex);
  if (!match) return [];

  const lines = match[1].trim().split('\n');
  const actions: PointAction[] = [];

  for (const line of lines) {
    // Parse markdown table rows: | Action | Points |
    const tableMatch = line.match(/\|\s*(.+?)\s*\|\s*([+-]?\d+)\s*\|/);
    if (tableMatch && !tableMatch[1].includes('---') && !tableMatch[1].toLowerCase().includes('action')) {
      actions.push({
        action: tableMatch[1].trim(),
        points: parseInt(tableMatch[2], 10),
      });
    }
  }

  return actions;
}

function parseRelationships(markdown: string): Record<string, string> {
  const regex = /## Relationships\n([\s\S]*?)(?=\n## |$)/i;
  const match = markdown.match(regex);
  if (!match) return {};

  const relationships: Record<string, string> = {};
  const lines = match[1].trim().split('\n');

  for (const line of lines) {
    // Parse: - **Name**: Description or - Name: Description
    const relMatch = line.match(/^-\s*\*?\*?(\w+)\*?\*?:\s*(.+)$/);
    if (relMatch) {
      relationships[relMatch[1].trim()] = relMatch[2].trim();
    }
  }

  return relationships;
}
