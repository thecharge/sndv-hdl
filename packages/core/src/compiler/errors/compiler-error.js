"use strict";
// Structured compiler error with source location for diagnostics.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerError = void 0;
exports.lexerError = lexerError;
exports.parserError = parserError;
exports.typeError = typeError;
exports.codegenError = codegenError;
class CompilerError extends Error {
    location;
    error_code;
    constructor(message, location, error_code) {
        const prefix = `[${error_code}] `;
        const suffix = ` (line ${location.line}, col ${location.column})`;
        super(prefix + message + suffix);
        this.location = location;
        this.error_code = error_code;
        this.name = 'CompilerError';
    }
}
exports.CompilerError = CompilerError;
// Factory helpers for common error categories.
function lexerError(message, location) {
    return new CompilerError(message, location, 'TS2V-1000');
}
function parserError(message, location) {
    return new CompilerError(message, location, 'TS2V-2000');
}
function typeError(message, location) {
    return new CompilerError(message, location, 'TS2V-3000');
}
function codegenError(message, location) {
    return new CompilerError(message, location, 'TS2V-4000');
}
//# sourceMappingURL=compiler-error.js.map