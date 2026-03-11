import { basename, join } from 'node:path';
import type {
  CompileArtifact,
  CompileDiagnostic,
  CompileRequest,
  CompileResult,
  CompilerAdapter,
} from '@ts2v/types';
import { buildFile, generateConstraints } from '../compiler/compiler-engine';
import type { FileSystemRepository } from '../repositories/file-system-repository';

export class LegacyCompilerAdapter implements CompilerAdapter {
  constructor(private readonly fileSystemRepository: FileSystemRepository) {}

  async compile(request: CompileRequest): Promise<CompileResult> {
    this.fileSystemRepository.ensureDirectory(request.outputDirectoryPath);
    const sourceFilePaths = this.fileSystemRepository.listTypeScriptFiles(request.inputPath);

    const artifacts: CompileArtifact[] = [];
    const diagnostics: CompileDiagnostic[] = [];

    for (const sourceFilePath of sourceFilePaths) {
      const buildResult = buildFile(sourceFilePath, request.outputDirectoryPath);
      if (!buildResult.success) {
        diagnostics.push({
          severity: 'error',
          code: 'LEGACY_BUILD_FAILED',
          message: `Failed to compile source: ${sourceFilePath}`,
        });
        continue;
      }

      artifacts.push({
        filePath: buildResult.outPath,
        lineCount: buildResult.lines,
        kind: 'systemverilog',
      });
    }

    if (request.boardConfigPath) {
      const constraintOutputPath = generateConstraints(
        request.boardConfigPath,
        request.outputDirectoryPath,
      );
      artifacts.push({
        filePath: constraintOutputPath,
        lineCount: 0,
        kind: 'constraints',
      });
    }

    const systemVerilogPaths = artifacts
      .filter((artifact) => artifact.kind === 'systemverilog')
      .map((artifact) => artifact.filePath);
    const manifestPath = join(request.outputDirectoryPath, 'sim.f');
    this.fileSystemRepository.writeManifest(manifestPath, systemVerilogPaths);
    artifacts.push({
      filePath: manifestPath,
      lineCount: systemVerilogPaths.length,
      kind: 'manifest',
    });

    const succeeded = diagnostics.every((diagnostic) => diagnostic.severity !== 'error');
    if (!succeeded && artifacts.length === 0) {
      diagnostics.push({
        severity: 'error',
        code: 'NO_OUTPUTS',
        message: `No artifacts generated for request input: ${basename(request.inputPath)}`,
      });
    }

    return { succeeded, artifacts, diagnostics };
  }
}
