import type { CompileRequest, CompileResult, CompilerAdapter } from '@ts2v/types';
import type { FileSystemRepository } from '../repositories/file-system-repository';
export declare class LegacyCompilerAdapter implements CompilerAdapter {
  private readonly fileSystemRepository;
  constructor(fileSystemRepository: FileSystemRepository);
  compile(request: CompileRequest): Promise<CompileResult>;
}
