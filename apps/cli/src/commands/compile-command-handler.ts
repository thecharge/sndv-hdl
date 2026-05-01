import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { Ts2vCompilationFacade } from '@ts2v/core';
import { getAdapter } from '@ts2v/toolchain';
import { type CompileRequest, SupportedBoardId } from '@ts2v/types';

const BOARD_ID_MAP: Record<string, SupportedBoardId> = Object.fromEntries(
  Object.values(SupportedBoardId).map((id) => [id, id as SupportedBoardId]),
);

export class CompileCommandHandler {
  private resolveTopModuleName(outputSystemVerilogPath: string, fallbackName: string): string {
    const source = readFileSync(outputSystemVerilogPath, 'utf8');
    const moduleDefs = [...source.matchAll(/\bmodule\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map(
      (m) => m[1],
    );
    if (moduleDefs.length <= 1) return moduleDefs[0] ?? fallbackName;
    const instantiated = new Set<string>();
    for (const name of moduleDefs) {
      const re = new RegExp(`\\b${name}\\s+[A-Za-z_][A-Za-z0-9_]*\\s*\\(`, 'g');
      if (re.test(source)) instantiated.add(name);
    }
    const topCandidates = moduleDefs.filter((n) => !instantiated.has(n));
    return topCandidates[0] ?? moduleDefs[moduleDefs.length - 1] ?? fallbackName;
  }

  private resolveBoardId(boardConfigPath: string): SupportedBoardId {
    const raw = JSON.parse(readFileSync(boardConfigPath, 'utf-8')) as { id?: string };
    const boardId = raw.id ?? basename(boardConfigPath, '.board.json');
    const resolved = BOARD_ID_MAP[boardId];
    if (!resolved) {
      const registered = Object.values(SupportedBoardId).join(', ');
      console.error(`[error] Unknown board id '${boardId}'. Registered boards: ${registered}`);
      process.exit(1);
    }
    return resolved;
  }

  async execute(options: {
    inputPath: string;
    outputDirectoryPath: string;
    boardConfigPath?: string;
    synthesizeAndFlash: boolean;
    diagnosticsFormat?: 'json';
    clockConstraintsPath?: string;
  }): Promise<void> {
    const resolvedBoardId = options.boardConfigPath
      ? this.resolveBoardId(resolve(options.boardConfigPath))
      : undefined;

    const compileRequest: CompileRequest = {
      inputPath: resolve(options.inputPath),
      outputDirectoryPath: resolve(options.outputDirectoryPath),
      boardConfigPath: options.boardConfigPath ? resolve(options.boardConfigPath) : undefined,
      resolvedBoardId,
      clockConstraintsPath: options.clockConstraintsPath
        ? resolve(options.clockConstraintsPath)
        : undefined,
    };

    const compilationFacade = new Ts2vCompilationFacade();
    const compileResult = await compilationFacade.compile(compileRequest);

    for (const artifact of compileResult.artifacts) {
      console.log(`[artifact] ${artifact.kind}: ${artifact.filePath}`);
    }

    if (options.diagnosticsFormat === 'json') {
      for (const diagnostic of compileResult.diagnostics) {
        console.log(JSON.stringify(diagnostic));
      }
    } else {
      for (const diagnostic of compileResult.diagnostics) {
        console.error(`[${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.message}`);
      }
    }

    if (!compileResult.succeeded) {
      throw new Error('Compilation failed. See diagnostics above.');
    }

    if (!options.synthesizeAndFlash) {
      return;
    }

    if (!resolvedBoardId) {
      throw new Error('--board is required for synthesis and flash.');
    }

    const adapterFactory = getAdapter(resolvedBoardId);
    if (!adapterFactory) {
      const registered = Object.values(SupportedBoardId).join(', ');
      console.error(
        `[error] No toolchain adapter registered for board '${resolvedBoardId}'. Registered: ${registered}`,
      );
      process.exit(1);
    }

    const sourceBaseName = basename(options.inputPath).replace('.ts', '');
    const topModuleName = this.resolveTopModuleName(
      `${resolve(options.outputDirectoryPath)}/${sourceBaseName}.sv`,
      sourceBaseName,
    );

    const adapter = await adapterFactory();
    const synthesisResult = await adapter.synthesize({ compileRequest, topModuleName });

    synthesisResult.commandLog.forEach((entry) => console.log(`[toolchain] ${entry}`));
    synthesisResult.outputs.forEach((entry) => console.log(entry));

    if (!synthesisResult.succeeded) {
      throw new Error(
        'Synthesis failed. Verify OSS CAD container image contents and board configuration.',
      );
    }

    const bitstreamPath = `${resolve(options.outputDirectoryPath)}/${sourceBaseName}.fs`;
    const flashResult = await adapter.flash({
      boardId: resolvedBoardId,
      bitstreamPath,
    });

    flashResult.commandLog.forEach((entry) => console.log(`[programmer] ${entry}`));
    flashResult.outputs.forEach((entry) => console.log(entry));

    if (!flashResult.succeeded) {
      throw new Error('Programming failed. Confirm USB permissions and board connection.');
    }
  }
}
