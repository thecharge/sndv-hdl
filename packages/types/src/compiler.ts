import type { SupportedBoardId } from './config';

/** Compilation mode: class-based hardware modules or function-based modules. */
export type CompilationMode = 'class' | 'function';

/** Input parameters for a single compile operation. */
export interface CompileRequest {
  /** Absolute path to the TypeScript source file or directory to compile. */
  readonly inputPath: string;
  /** Absolute path to the directory where generated artifacts will be written. */
  readonly outputDirectoryPath: string;
  /** Optional path to a `.board.json` file for constraint generation. */
  readonly boardConfigPath?: string;
  /** Board ID resolved from the board config, used for toolchain selection. */
  readonly resolvedBoardId?: SupportedBoardId;
  /** Optional path to write nextpnr SDC clock constraints from @ClockDomain declarations. */
  readonly clockConstraintsPath?: string;
}

/** A single generated output file produced by a compilation. */
export interface CompileArtifact {
  /** Absolute path to the generated file. */
  readonly filePath: string;
  /** Number of lines in the generated file. */
  readonly lineCount: number;
  /** Category of the artifact. */
  readonly kind: 'systemverilog' | 'constraints' | 'manifest';
}

/** A structured diagnostic message emitted during compilation. */
export interface CompileDiagnostic {
  /** Severity level of the diagnostic. */
  readonly severity: 'error' | 'warning' | 'info';
  /** Machine-readable error code (e.g. `TS2V-2000`). */
  readonly code: string;
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Optional source location where the diagnostic originated. */
  readonly location?: { filePath?: string; line?: number; column?: number };
}

/** The overall result of a compile operation. */
export interface CompileResult {
  /** True when no error-severity diagnostics were emitted. */
  readonly succeeded: boolean;
  /** All files generated during this compilation. */
  readonly artifacts: ReadonlyArray<CompileArtifact>;
  /** All diagnostic messages emitted during this compilation. */
  readonly diagnostics: ReadonlyArray<CompileDiagnostic>;
}

/** Contract for a compiler back-end that accepts a `CompileRequest`. */
export interface CompilerAdapter {
  compile(request: CompileRequest): Promise<CompileResult>;
}
