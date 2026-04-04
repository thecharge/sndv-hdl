import type { CompileRequest, CompileResult, CompilerAdapter } from '@ts2v/types';
export declare class CompileSourceCommand {
  private readonly compilerAdapter;
  constructor(compilerAdapter: CompilerAdapter);
  execute(request: CompileRequest): Promise<CompileResult>;
}
