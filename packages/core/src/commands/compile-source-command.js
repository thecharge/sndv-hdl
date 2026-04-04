"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompileSourceCommand = void 0;
class CompileSourceCommand {
    compilerAdapter;
    constructor(compilerAdapter) {
        this.compilerAdapter = compilerAdapter;
    }
    async execute(request) {
        return this.compilerAdapter.compile(request);
    }
}
exports.CompileSourceCommand = CompileSourceCommand;
//# sourceMappingURL=compile-source-command.js.map