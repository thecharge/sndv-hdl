export declare class FileSystemRepository {
  ensureDirectory(directoryPath: string): void;
  listTypeScriptFiles(inputPath: string): ReadonlyArray<string>;
  writeManifest(outputPath: string, generatedFilePaths: ReadonlyArray<string>): void;
}
