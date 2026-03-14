import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { Ts2vCompilationFacade } from '@ts2v/core';
import { TangNano20kToolchainFacade } from '@ts2v/toolchain';
import { type CompileRequest, SupportedBoardId } from '@ts2v/types';

export class CompileCommandHandler {
  private resolveTopModuleName(outputSystemVerilogPath: string, fallbackName: string): string {
    const source = readFileSync(outputSystemVerilogPath, 'utf8');
    // Collect all module definitions
    const moduleDefs = [...source.matchAll(/\bmodule\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map(
      (m) => m[1],
    );
    if (moduleDefs.length <= 1) return moduleDefs[0] ?? fallbackName;
    // Find modules that are instantiated inside other modules.
    // Instantiation pattern: ModuleName instance_name (
    const instantiated = new Set<string>();
    for (const name of moduleDefs) {
      const re = new RegExp(`\\b${name}\\s+[A-Za-z_][A-Za-z0-9_]*\\s*\\(`, 'g');
      if (re.test(source)) instantiated.add(name);
    }
    // The top module is the one never instantiated by another module in this file.
    const topCandidates = moduleDefs.filter((n) => !instantiated.has(n));
    return topCandidates[0] ?? moduleDefs[moduleDefs.length - 1] ?? fallbackName;
  }

  async execute(options: {
    inputPath: string;
    outputDirectoryPath: string;
    boardConfigPath?: string;
    synthesizeAndFlash: boolean;
  }): Promise<void> {
    const compileRequest: CompileRequest = {
      inputPath: resolve(options.inputPath),
      outputDirectoryPath: resolve(options.outputDirectoryPath),
      boardConfigPath: options.boardConfigPath ? resolve(options.boardConfigPath) : undefined,
    };

    const compilationFacade = new Ts2vCompilationFacade();
    const compileResult = await compilationFacade.compile(compileRequest);

    for (const artifact of compileResult.artifacts) {
      console.log(`[artifact] ${artifact.kind}: ${artifact.filePath}`);
    }

    for (const diagnostic of compileResult.diagnostics) {
      console.error(`[${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.message}`);
    }

    if (!compileResult.succeeded) {
      throw new Error('Compilation failed. See diagnostics above.');
    }

    if (!options.synthesizeAndFlash) {
      return;
    }

    const sourceBaseName = basename(options.inputPath).replace('.ts', '');
    const topModuleName = this.resolveTopModuleName(
      `${resolve(options.outputDirectoryPath)}/${sourceBaseName}.sv`,
      sourceBaseName,
    );
    const toolchainFacade = new TangNano20kToolchainFacade();

    const synthesisResult = await toolchainFacade.synthesize({
      compileRequest,
      topModuleName,
    });

    synthesisResult.commandLog.forEach((entry) => console.log(`[toolchain] ${entry}`));
    synthesisResult.outputs.forEach((entry) => console.log(entry));

    if (!synthesisResult.succeeded) {
      throw new Error(
        'Synthesis failed. Verify OSS CAD container image contents and board configuration.',
      );
    }

    const bitstreamPath = `${resolve(options.outputDirectoryPath)}/${sourceBaseName}.fs`;
    const flashResult = await toolchainFacade.flash({
      boardId: SupportedBoardId.TangNano20k,
      bitstreamPath,
    });

    flashResult.commandLog.forEach((entry) => console.log(`[programmer] ${entry}`));
    flashResult.outputs.forEach((entry) => console.log(entry));

    if (!flashResult.succeeded) {
      throw new Error('Programming failed. Confirm USB permissions and board connection.');
    }
  }
}
