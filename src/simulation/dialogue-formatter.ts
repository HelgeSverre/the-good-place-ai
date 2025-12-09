export interface ParsedDialogue {
  characterName: string | null;
  stageDirections: string[];
  emotions: string[];
  dialogue: string;
  raw: string;
}

/**
 * Parse a character's response to extract stage directions, emotions, and dialogue
 *
 * Handles formats like:
 * - "Eleanor: [rolling eyes] "Hello there!""
 * - "[sighing heavily] "What now?""
 * - "*nervously* "Um, hi""
 * - Just plain dialogue
 */
export function parseDialogue(text: string, expectedCharacter?: string): ParsedDialogue {
  let remaining = text.trim();
  const result: ParsedDialogue = {
    characterName: expectedCharacter || null,
    stageDirections: [],
    emotions: [],
    dialogue: '',
    raw: text,
  };

  // Remove character name prefix if present (e.g., "Eleanor: " or "Eleanor:")
  const nameMatch = remaining.match(/^([A-Za-z][A-Za-z\s]*?):\s*/);
  if (nameMatch) {
    result.characterName = nameMatch[1].trim();
    remaining = remaining.substring(nameMatch[0].length);
  }

  // Extract all stage directions [in brackets]
  const stageDirectionRegex = /\[([^\]]+)\]/g;
  let match;
  while ((match = stageDirectionRegex.exec(remaining)) !== null) {
    result.stageDirections.push(match[1].trim());
  }
  remaining = remaining.replace(stageDirectionRegex, '').trim();

  // Extract all emotions *in asterisks*
  const emotionRegex = /\*([^*]+)\*/g;
  while ((match = emotionRegex.exec(remaining)) !== null) {
    result.emotions.push(match[1].trim());
  }
  remaining = remaining.replace(emotionRegex, '').trim();

  // Extract dialogue (in quotes or remaining text)
  const quoteMatch = remaining.match(/"([^"]+)"/);
  if (quoteMatch) {
    result.dialogue = quoteMatch[1].trim();
  } else {
    // No quotes - treat remaining text as dialogue
    result.dialogue = remaining.trim();
  }

  return result;
}

/**
 * Combine stage directions and emotions into a single description
 */
export function getCombinedAction(parsed: ParsedDialogue): string | null {
  const parts: string[] = [];

  if (parsed.stageDirections.length > 0) {
    parts.push(...parsed.stageDirections);
  }

  if (parsed.emotions.length > 0) {
    parts.push(...parsed.emotions);
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Format dialogue for terminal output with proper styling
 */
export function formatForTerminal(
  parsed: ParsedDialogue,
  characterName: string,
  formatters: {
    name: (text: string) => string;
    action: (text: string) => string;
    dialogue: (text: string) => string;
  }
): string {
  const lines: string[] = [];

  // Character name on its own line
  lines.push(formatters.name(characterName));

  // Combined action (stage directions + emotions)
  const action = getCombinedAction(parsed);
  if (action) {
    lines.push(formatters.action(`  ┊ ${action}`));
  }

  // Dialogue
  if (parsed.dialogue) {
    lines.push(formatters.dialogue(`  "${parsed.dialogue}"`));
  }

  return lines.join('\n');
}

/**
 * Format dialogue for plain text log file
 */
export function formatForLog(parsed: ParsedDialogue, characterName: string): string {
  const lines: string[] = [];

  lines.push(`${characterName.toUpperCase()}:`);

  const action = getCombinedAction(parsed);
  if (action) {
    lines.push(`  [${action}]`);
  }

  if (parsed.dialogue) {
    lines.push(`  "${parsed.dialogue}"`);
  }

  return lines.join('\n');
}
