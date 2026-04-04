"use strict";
// Thin orchestration layer. Implementation split across sibling files:
//   class-module-ast.ts          - AST type definitions
//   class-module-parser-base.ts  - Token navigation base class
//   class-decl-parser.ts         - Declaration-level parser
//   class-stmt-parser.ts         - Statement-level parser
//   class-module-parser.ts       - Top-level module parser
//   class-sv-helpers.ts          - SV keyword table and pure helpers
//   class-emitter-base.ts        - Line/indent + expression translation
//   class-sequential-emitter.ts  - always_ff / always_comb emission
//   class-module-emitter.ts      - Structural module emitter
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassModuleEmitter = exports.ClassModuleParser = void 0;
exports.compileClassModule = compileClassModule;
__exportStar(require("./class-module-ast"), exports);
var class_module_parser_1 = require("./class-module-parser");
Object.defineProperty(exports, "ClassModuleParser", { enumerable: true, get: function () { return class_module_parser_1.ClassModuleParser; } });
var class_module_emitter_1 = require("./class-module-emitter");
Object.defineProperty(exports, "ClassModuleEmitter", { enumerable: true, get: function () { return class_module_emitter_1.ClassModuleEmitter; } });
const class_module_parser_2 = require("./class-module-parser");
const class_module_emitter_2 = require("./class-module-emitter");
function compileClassModule(source) {
    try {
        const parser = new class_module_parser_2.ClassModuleParser(source);
        const parsed = parser.parse();
        const emitter = new class_module_emitter_2.ClassModuleEmitter();
        const systemverilog = emitter.emit(parsed);
        return { success: true, systemverilog, errors: [], parsed };
    }
    catch (error) {
        return { success: false, systemverilog: '', errors: [error.message], parsed: null };
    }
}
//# sourceMappingURL=class-module-compiler.js.map