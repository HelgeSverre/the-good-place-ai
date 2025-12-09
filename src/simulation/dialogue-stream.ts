import chalk from 'chalk';
import { getCharacterColor } from '../utils/colors.js';

export class DialogueStreamer {
  private currentLine = '';

  printCharacterName(characterName: string): void {
    const color = getCharacterColor(characterName);
    process.stdout.write(chalk.hex(color).bold(`${characterName}: `));
    this.currentLine = '';
  }

  streamCharacterText(characterName: string, text: string): void {
    const color = getCharacterColor(characterName);
    process.stdout.write(chalk.hex(color)(text));
    this.currentLine += text;
  }

  endCharacterLine(): void {
    console.log();
    this.currentLine = '';
  }

  printSceneDirection(direction: string): void {
    console.log();
    console.log(chalk.gray.italic(`[${direction}]`));
    console.log();
  }

  printSceneBreak(): void {
    console.log();
    console.log(chalk.gray('─'.repeat(60)));
    console.log();
  }

  printSceneEnd(button?: string, summary?: string): void {
    console.log();
    console.log(chalk.gray('═'.repeat(60)));
    if (button) {
      console.log(chalk.yellow.italic(`\n${button}`));
    }
    if (summary) {
      console.log(chalk.gray(`\n${summary}`));
    }
    console.log(chalk.gray('═'.repeat(60)));
    console.log();
  }

  printTitle(title: string): void {
    console.log();
    console.log(chalk.bold.white('═'.repeat(60)));
    console.log(chalk.bold.white.bgBlue(` ${title.toUpperCase()} `));
    console.log(chalk.bold.white('═'.repeat(60)));
    console.log();
  }

  printInfo(text: string): void {
    console.log(chalk.cyan(text));
  }

  printError(text: string): void {
    console.log(chalk.red(`Error: ${text}`));
  }

  printDebug(text: string): void {
    console.log(chalk.dim(`[DEBUG] ${text}`));
  }
}

export const streamer = new DialogueStreamer();
