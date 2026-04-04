"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ts2vCompilationFacade = void 0;
const compile_source_command_1 = require("../commands/compile-source-command");
const compiler_adapter_factory_1 = require("../factories/compiler-adapter-factory");
class Ts2vCompilationFacade {
    compileSourceCommand;
    constructor() {
        const compilerAdapter = new compiler_adapter_factory_1.CompilerAdapterFactory().create();
        this.compileSourceCommand = new compile_source_command_1.CompileSourceCommand(compilerAdapter);
    }
    async compile(request) {
        return this.compileSourceCommand.execute(request);
    }
}
exports.Ts2vCompilationFacade = Ts2vCompilationFacade;
//# sourceMappingURL=ts2v-compilation-facade.js.map