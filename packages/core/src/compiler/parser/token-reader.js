"use strict";
// Navigable token stream with position tracking and lookahead helpers.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenReader = void 0;
const token_1 = require("../lexer/token");
const compiler_error_1 = require("../errors/compiler-error");
class TokenReader {
    tokens;
    position = 0;
    constructor(tokens) {
        this.tokens = tokens;
    }
    currentToken() {
        return this.tokens[this.position];
    }
    currentLocation() {
        const token = this.currentToken();
        return { line: token.line, column: token.column };
    }
    advance() {
        const token = this.currentToken();
        this.position++;
        return token;
    }
    check(kind) {
        return this.currentToken().kind === kind;
    }
    expect(kind, description) {
        if (this.check(kind))
            return this.advance();
        const token = this.currentToken();
        throw (0, compiler_error_1.parserError)(`Expected ${description} but found "${token.value}"`, { line: token.line, column: token.column });
    }
    isAtEnd() {
        return this.currentToken().kind === token_1.TokenKind.EndOfFile;
    }
}
exports.TokenReader = TokenReader;
//# sourceMappingURL=token-reader.js.map