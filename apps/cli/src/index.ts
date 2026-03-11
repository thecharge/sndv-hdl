#!/usr/bin/env bun

import { CompileCommandHandler } from './commands/compile-command-handler';
import { CliArgumentsParser } from './parsers/cli-arguments-parser';

async function main(): Promise<void> {
  const cliArguments = new CliArgumentsParser().parse(process.argv);

  if (cliArguments.command === 'compile') {
    const compileCommandHandler = new CompileCommandHandler();
    await compileCommandHandler.execute(cliArguments);
    return;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
