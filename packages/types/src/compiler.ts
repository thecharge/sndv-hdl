export type CompilationMode = 'class' | 'function';

export interface CompileRequest {
  readonly inputPath: string;
  readonly outputDirectoryPath: string;
  readonly boardConfigPath?: string;
}

export interface CompileArtifact {
  readonly filePath: string;
  readonly lineCount: number;
  readonly kind: 'systemverilog' | 'constraints' | 'manifest';
}

export interface CompileDiagnostic {
  readonly severity: 'error' | 'warning' | 'info';
  readonly code: string;
  readonly message: string;
}

export interface CompileResult {
  readonly succeeded: boolean;
  readonly artifacts: ReadonlyArray<CompileArtifact>;
  readonly diagnostics: ReadonlyArray<CompileDiagnostic>;
}

export interface CompilerAdapter {
  compile(request: CompileRequest): Promise<CompileResult>;
}
