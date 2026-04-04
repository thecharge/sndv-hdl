"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemRepository = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
class FileSystemRepository {
    ensureDirectory(directoryPath) {
        (0, node_fs_1.mkdirSync)(directoryPath, { recursive: true });
    }
    listTypeScriptFiles(inputPath) {
        if ((0, node_fs_1.statSync)(inputPath).isFile()) {
            return [inputPath];
        }
        return (0, node_fs_1.readdirSync)(inputPath)
            .filter((entryName) => entryName.endsWith('.ts'))
            .map((entryName) => (0, node_path_1.join)(inputPath, entryName));
    }
    writeManifest(outputPath, generatedFilePaths) {
        (0, node_fs_1.writeFileSync)(outputPath, generatedFilePaths.join('\n'));
    }
}
exports.FileSystemRepository = FileSystemRepository;
//# sourceMappingURL=file-system-repository.js.map