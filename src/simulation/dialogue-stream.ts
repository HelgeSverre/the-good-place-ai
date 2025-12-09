import chalk from 'chalk';
import { getCharacterColor } from '../utils/colors.js';
import { parseDialogue, getCombinedAction, type ParsedDialogue } from './dialogue-formatter.js';

export class DialogueStreamer {
  private buffer = '';
  private currentCharacter = '';

  /**
   * Start buffering dialogue for a character (used during streaming)
   */
  startCharacterTurn(characterName: string): void {
    this.currentCharacter = characterName;
    this.buffer = '';
  }

  /**
   * Add text to the buffer during streaming
   */
  bufferText(text: string): void {
    this.buffer += text;
  }

  /**
   * Finish the turn and print formatted output
   */
  finishCharacterTurn(): ParsedDialogue {
    const parsed = parseDialogue(this.buffer, this.currentCharacter);
    this.printFormattedDialogue(this.currentCharacter, parsed);
    return parsed;
  }

  /**
   * Print a complete dialogue turn with formatting
   */
  printFormattedDialogue(characterName: string, parsed: ParsedDialogue): void {
    const color = getCharacterColor(characterName);

    // Character name (bold, colored)
    console.log(chalk.hex(color).bold(characterName));

    // Stage directions + emotions (dim, italic, with ┊ prefix)
    const action = getCombinedAction(parsed);
    if (action) {
      console.log(chalk.dim.italic(`  ┊ ${action}`));
    }

    // Dialogue (colored)
    if (parsed.dialogue) {
      console.log(chalk.hex(color)(`  "${parsed.dialogue}"`));
    }

    // Blank line after each turn
    console.log();
  }

  /**
   * Print raw dialogue with basic formatting (fallback for streaming display)
   */
  printRawDialogue(characterName: string, text: string): void {
    const parsed = parseDialogue(text, characterName);
    this.printFormattedDialogue(characterName, parsed);
  }

  /**
   * Legacy: Print character name (for backwards compatibility during streaming)
   */
  printCharacterName(characterName: string): void {
    const color = getCharacterColor(characterName);
    process.stdout.write(chalk.hex(color).bold(`${characterName}: `));
  }

  /**
   * Legacy: Stream text character by character
   */
  streamCharacterText(characterName: string, text: string): void {
    const color = getCharacterColor(characterName);
    process.stdout.write(chalk.hex(color)(text));
  }

  /**
   * Legacy: End the current line
   */
  endCharacterLine(): void {
    console.log();
  }

  printSceneDirection(direction: string): void {
    console.log();
    console.log(chalk.gray.italic(`┌─ Scene ─────────────────────────────────────────────────┐`));
    console.log(chalk.gray.italic(`│ ${direction.substring(0, 56).padEnd(56)} │`));
    if (direction.length > 56) {
      // Wrap long directions
      const remaining = direction.substring(56);
      const lines = remaining.match(/.{1,56}/g) || [];
      for (const line of lines) {
        console.log(chalk.gray.italic(`│ ${line.padEnd(56)} │`));
      }
    }
    console.log(chalk.gray.italic(`└──────────────────────────────────────────────────────────┘`));
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
    console.log(chalk.bold.gray(' SCENE END '));
    console.log(chalk.gray('═'.repeat(60)));
    if (button) {
      console.log(chalk.yellow.italic(`\n✦ ${button}`));
    }
    if (summary) {
      console.log(chalk.gray(`\n${summary}`));
    }
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
    console.log(chalk.cyan(`ℹ ${text}`));
  }

  printSuccess(text: string): void {
    console.log(chalk.green(`✓ ${text}`));
  }

  printError(text: string): void {
    console.log(chalk.red(`✗ Error: ${text}`));
  }

  printDebug(text: string): void {
    console.log(chalk.dim(`[DEBUG] ${text}`));
  }
}

export const streamer = new DialogueStreamer();
