import type { CompilerAdapter } from '@ts2v/types';
import { LegacyCompilerAdapter } from '../adapters/legacy-compiler-adapter';
import { FileSystemRepository } from '../repositories/file-system-repository';

export class CompilerAdapterFactory {
  create(): CompilerAdapter {
    const fileSystemRepository = new FileSystemRepository();
    return new LegacyCompilerAdapter(fileSystemRepository);
  }
}
