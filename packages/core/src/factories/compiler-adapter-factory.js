"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerAdapterFactory = void 0;
const legacy_compiler_adapter_1 = require("../adapters/legacy-compiler-adapter");
const file_system_repository_1 = require("../repositories/file-system-repository");
class CompilerAdapterFactory {
    create() {
        const fileSystemRepository = new file_system_repository_1.FileSystemRepository();
        return new legacy_compiler_adapter_1.LegacyCompilerAdapter(fileSystemRepository);
    }
}
exports.CompilerAdapterFactory = CompilerAdapterFactory;
//# sourceMappingURL=compiler-adapter-factory.js.map