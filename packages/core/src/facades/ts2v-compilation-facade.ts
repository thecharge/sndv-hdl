import type { CompileRequest, CompileResult } from '@ts2v/types';
import { CompileSourceCommand } from '../commands/compile-source-command';
import { CompilerAdapterFactory } from '../factories/compiler-adapter-factory';

export class Ts2vCompilationFacade {
  private readonly compileSourceCommand: CompileSourceCommand;

  constructor() {
    const compilerAdapter = new CompilerAdapterFactory().create();
    this.compileSourceCommand = new CompileSourceCommand(compilerAdapter);
  }

  async compile(request: CompileRequest): Promise<CompileResult> {
    return this.compileSourceCommand.execute(request);
  }
}
