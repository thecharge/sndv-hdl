import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export class FileSystemRepository {
  ensureDirectory(directoryPath: string): void {
    mkdirSync(directoryPath, { recursive: true });
  }

  listTypeScriptFiles(inputPath: string): ReadonlyArray<string> {
    if (statSync(inputPath).isFile()) {
      return [inputPath];
    }

    return readdirSync(inputPath)
      .filter((entryName) => entryName.endsWith('.ts'))
      .map((entryName) => join(inputPath, entryName));
  }

  writeManifest(outputPath: string, generatedFilePaths: ReadonlyArray<string>): void {
    writeFileSync(outputPath, generatedFilePaths.join('\n'));
  }
}
