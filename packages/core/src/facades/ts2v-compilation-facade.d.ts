import type { CompileRequest, CompileResult } from '@ts2v/types';
export declare class Ts2vCompilationFacade {
  private readonly compileSourceCommand;
  constructor();
  compile(request: CompileRequest): Promise<CompileResult>;
}
