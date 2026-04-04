import { readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import type {
  CompileArtifact,
  CompileDiagnostic,
  CompileRequest,
  CompileResult,
  CompilerAdapter,
} from '@ts2v/types';
import { buildClassSource, buildFile } from '../compiler/compiler-engine';
import {
  type BoardDefinition,
  generateBoardConstraints,
} from '../compiler/constraints/generate-board-constraints';
import type { FileSystemRepository } from '../repositories/file-system-repository';

export class LegacyCompilerAdapter implements CompilerAdapter {
  constructor(private readonly fileSystemRepository: FileSystemRepository) {}

  async compile(request: CompileRequest): Promise<CompileResult> {
    this.fileSystemRepository.ensureDirectory(request.outputDirectoryPath);

    const artifacts: CompileArtifact[] = [];
    const diagnostics: CompileDiagnostic[] = [];

    // Directory of class-mode sources → concatenate into one compilation unit.
    const isDirectory = statSync(request.inputPath).isDirectory();
    if (isDirectory) {
      const sourceFilePaths = this.fileSystemRepository.listTypeScriptFiles(request.inputPath);
      const sources = sourceFilePaths.map((p) => readFileSync(p, 'utf-8'));
      const hasClassMode = sources.some(
        (s) => s.includes('@Module') || s.includes('extends HardwareModule'),
      );

      if (hasClassMode) {
        const combinedSource = sources.join('\n\n');
        const dirName = basename(request.inputPath);
        const buildResult = buildClassSource(combinedSource, dirName, request.outputDirectoryPath);
        if (!buildResult.success) {
          diagnostics.push({
            severity: 'error',
            code: 'MULTIFILE_BUILD_FAILED',
            message: `Failed to compile multi-file directory: ${request.inputPath}`,
          });
        } else {
          artifacts.push({
            filePath: buildResult.outPath,
            lineCount: buildResult.lines,
            kind: 'systemverilog',
          });
        }
        // Fall through to constraints + manifest below.
      } else {
        // Function-mode directory: compile each file individually.
        for (const sourceFilePath of sourceFilePaths) {
          const buildResult = buildFile(sourceFilePath, request.outputDirectoryPath);
          if (!buildResult.success) {
            diagnostics.push({
              severity: 'error',
              code: 'LEGACY_BUILD_FAILED',
              message: `Failed to compile source: ${sourceFilePath}`,
              ...(buildResult.compilerError && {
                location: {
                  filePath: buildResult.compilerError.location.file_path ?? sourceFilePath,
                  line: buildResult.compilerError.location.line,
                  column: buildResult.compilerError.location.column,
                },
              }),
            });
            continue;
          }
          artifacts.push({
            filePath: buildResult.outPath,
            lineCount: buildResult.lines,
            kind: 'systemverilog',
          });
        }
      }
    } else {
      // Single file compilation (existing behaviour).
      const buildResult = buildFile(request.inputPath, request.outputDirectoryPath);
      if (!buildResult.success) {
        diagnostics.push({
          severity: 'error',
          code: 'LEGACY_BUILD_FAILED',
          message: `Failed to compile source: ${request.inputPath}`,
          ...(buildResult.compilerError && {
            location: {
              filePath: buildResult.compilerError.location.file_path ?? request.inputPath,
              line: buildResult.compilerError.location.line,
              column: buildResult.compilerError.location.column,
            },
          }),
        });
      } else {
        artifacts.push({
          filePath: buildResult.outPath,
          lineCount: buildResult.lines,
          kind: 'systemverilog',
        });
      }
    }

    if (request.boardConfigPath) {
      const boardDef = JSON.parse(
        readFileSync(request.boardConfigPath, 'utf-8'),
      ) as BoardDefinition;
      const constraintOutputPath = generateBoardConstraints(boardDef, request.outputDirectoryPath);
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
