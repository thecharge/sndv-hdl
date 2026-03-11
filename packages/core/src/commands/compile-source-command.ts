import type { CompileRequest, CompileResult, CompilerAdapter } from '@ts2v/types';

export class CompileSourceCommand {
  constructor(private readonly compilerAdapter: CompilerAdapter) {}

  async execute(request: CompileRequest): Promise<CompileResult> {
    return this.compilerAdapter.compile(request);
  }
}
