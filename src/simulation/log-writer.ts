import { writeFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

export interface LogWriterOptions {
  scenarioName: string;
  characters: string[];
  logsDir?: string;
}

export class LogWriter {
  private filePath: string;
  private startTime: Date;
  private turnCount: number = 0;

  constructor(options: LogWriterOptions) {
    this.startTime = new Date();

    const logsDir = options.logsDir || join(PROJECT_ROOT, 'logs');

    // Create logs directory if it doesn't exist
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    // Generate timestamped filename
    const timestamp = this.formatTimestamp(this.startTime);
    const safeScenarioName = options.scenarioName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    this.filePath = join(logsDir, `scene-${safeScenarioName}-${timestamp}.txt`);

    // Write header
    this.writeHeader(options);
  }

  private formatTimestamp(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  private formatDateTime(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  private writeHeader(options: LogWriterOptions): void {
    const divider = '='.repeat(80);
    const header = `${divider}
THE GOOD PLACE AI SIMULATOR - Scene Log
${divider}
Date: ${this.formatDateTime(this.startTime)}
Scenario: ${options.scenarioName}
Characters: ${options.characters.join(', ')}
${divider}

`;
    writeFileSync(this.filePath, header);
  }

  logSceneDirection(direction: string): void {
    const text = `[SCENE] ${direction}\n\n`;
    appendFileSync(this.filePath, text);
  }

  logDialogue(characterName: string, stageDirection: string | null, dialogue: string): void {
    this.turnCount++;

    let text = `${characterName.toUpperCase()}:\n`;

    if (stageDirection) {
      text += `  [${stageDirection}]\n`;
    }

    if (dialogue) {
      text += `  "${dialogue}"\n`;
    }

    text += '\n';
    appendFileSync(this.filePath, text);
  }

  logRawText(characterName: string, rawText: string): void {
    this.turnCount++;

    // Simple logging of raw text with character name
    const text = `${characterName.toUpperCase()}:\n  ${rawText.replace(/\n/g, '\n  ')}\n\n`;
    appendFileSync(this.filePath, text);
  }

  finalize(summary?: string): void {
    const endTime = new Date();
    const divider = '='.repeat(80);

    let footer = `${divider}
Scene ended at: ${this.formatDateTime(endTime)}
Total turns: ${this.turnCount}
`;

    if (summary) {
      footer += `\nSummary: ${summary}\n`;
    }

    footer += `${divider}\n`;
    appendFileSync(this.filePath, footer);
  }

  getFilePath(): string {
    return this.filePath;
  }
}
