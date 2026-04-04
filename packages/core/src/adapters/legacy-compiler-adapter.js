"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyCompilerAdapter = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const compiler_engine_1 = require("../compiler/compiler-engine");
const generate_board_constraints_1 = require("../compiler/constraints/generate-board-constraints");
class LegacyCompilerAdapter {
    fileSystemRepository;
    constructor(fileSystemRepository) {
        this.fileSystemRepository = fileSystemRepository;
    }
    async compile(request) {
        this.fileSystemRepository.ensureDirectory(request.outputDirectoryPath);
        const artifacts = [];
        const diagnostics = [];
        // Directory of class-mode sources → concatenate into one compilation unit.
        const isDirectory = (0, node_fs_1.statSync)(request.inputPath).isDirectory();
        if (isDirectory) {
            const sourceFilePaths = this.fileSystemRepository.listTypeScriptFiles(request.inputPath);
            const sources = sourceFilePaths.map((p) => (0, node_fs_1.readFileSync)(p, 'utf-8'));
            const hasClassMode = sources.some((s) => s.includes('@Module') || s.includes('extends HardwareModule'));
            if (hasClassMode) {
                const combinedSource = sources.join('\n\n');
                const dirName = (0, node_path_1.basename)(request.inputPath);
                const buildResult = (0, compiler_engine_1.buildClassSource)(combinedSource, dirName, request.outputDirectoryPath);
                if (!buildResult.success) {
                    diagnostics.push({
                        severity: 'error',
                        code: 'MULTIFILE_BUILD_FAILED',
                        message: `Failed to compile multi-file directory: ${request.inputPath}`,
                    });
                }
                else {
                    artifacts.push({
                        filePath: buildResult.outPath,
                        lineCount: buildResult.lines,
                        kind: 'systemverilog',
                    });
                }
                // Fall through to constraints + manifest below.
            }
            else {
                // Function-mode directory: compile each file individually.
                for (const sourceFilePath of sourceFilePaths) {
                    const buildResult = (0, compiler_engine_1.buildFile)(sourceFilePath, request.outputDirectoryPath);
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
        }
        else {
            // Single file compilation (existing behaviour).
            const buildResult = (0, compiler_engine_1.buildFile)(request.inputPath, request.outputDirectoryPath);
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
            }
            else {
                artifacts.push({
                    filePath: buildResult.outPath,
                    lineCount: buildResult.lines,
                    kind: 'systemverilog',
                });
            }
        }
        if (request.boardConfigPath) {
            const boardDef = JSON.parse((0, node_fs_1.readFileSync)(request.boardConfigPath, 'utf-8'));
            const constraintOutputPath = (0, generate_board_constraints_1.generateBoardConstraints)(boardDef, request.outputDirectoryPath);
            artifacts.push({
                filePath: constraintOutputPath,
                lineCount: 0,
                kind: 'constraints',
            });
        }
        const systemVerilogPaths = artifacts
            .filter((artifact) => artifact.kind === 'systemverilog')
            .map((artifact) => artifact.filePath);
        const manifestPath = (0, node_path_1.join)(request.outputDirectoryPath, 'sim.f');
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
                message: `No artifacts generated for request input: ${(0, node_path_1.basename)(request.inputPath)}`,
            });
        }
        return { succeeded, artifacts, diagnostics };
    }
}
exports.LegacyCompilerAdapter = LegacyCompilerAdapter;
//# sourceMappingURL=legacy-compiler-adapter.js.map