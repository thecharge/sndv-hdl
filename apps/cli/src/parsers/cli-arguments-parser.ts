export interface CliArguments {
  readonly command: 'compile';
  readonly inputPath: string;
  readonly outputDirectoryPath: string;
  readonly boardConfigPath?: string;
  readonly synthesizeAndFlash: boolean;
  readonly diagnosticsFormat?: 'json';
}

export class CliArgumentsParser {
  parse(argv: ReadonlyArray<string>): CliArguments {
    const command = argv[2];
    if (command !== 'compile') {
      throw new Error(
        'Usage: ts2v compile <input.ts|input-dir> [--out <dir>] [--board <board.json>] [--flash] [--diagnostics=json]',
      );
    }

    const inputPath = argv[3];
    if (!inputPath) {
      throw new Error('Missing required input path.');
    }

    let outputDirectoryPath = '.artifacts/tang20k';
    let boardConfigPath: string | undefined;
    let synthesizeAndFlash = false;
    let diagnosticsFormat: 'json' | undefined;

    for (let index = 4; index < argv.length; index += 1) {
      const currentArgument = argv[index];
      if (currentArgument === '--out') {
        outputDirectoryPath = argv[index + 1] ?? outputDirectoryPath;
        index += 1;
        continue;
      }

      if (currentArgument === '--board') {
        boardConfigPath = argv[index + 1];
        index += 1;
        continue;
      }

      if (currentArgument === '--flash') {
        synthesizeAndFlash = true;
        continue;
      }

      if (currentArgument === '--diagnostics=json') {
        diagnosticsFormat = 'json';
      }
    }

    return {
      command: 'compile',
      inputPath,
      outputDirectoryPath,
      boardConfigPath,
      synthesizeAndFlash,
      diagnosticsFormat,
    };
  }
}
