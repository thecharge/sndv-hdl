import { describe, expect, test } from 'bun:test';
import { CliArgumentsParser } from './cli-arguments-parser';

describe('CliArgumentsParser', () => {
  test('parses compile command with defaults', () => {
    const parser = new CliArgumentsParser();
    const result = parser.parse(['bun', 'ts2v', 'compile', 'examples/blinker/blinker.ts']);

    expect(result.command).toBe('compile');
    expect(result.inputPath).toBe('examples/blinker/blinker.ts');
    expect(result.outputDirectoryPath).toBe('.artifacts/tang20k');
    expect(result.synthesizeAndFlash).toBe(false);
  });

  test('parses optional board and flash flags', () => {
    const parser = new CliArgumentsParser();
    const result = parser.parse([
      'bun',
      'ts2v',
      'compile',
      'examples/blinker/blinker.ts',
      '--out',
      '.artifacts/custom',
      '--board',
      'boards/tang_nano_20k.board.json',
      '--flash',
    ]);

    expect(result.outputDirectoryPath).toBe('.artifacts/custom');
    expect(result.boardConfigPath).toBe('boards/tang_nano_20k.board.json');
    expect(result.synthesizeAndFlash).toBe(true);
  });
});
