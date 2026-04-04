"use strict";
// Character-level source reader with position, line, and column tracking.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CharReader = void 0;
const compiler_error_1 = require("../errors/compiler-error");
class CharReader {
    source;
    position = 0;
    line = 1;
    column = 1;
    constructor(source) {
        this.source = source;
    }
    peek() {
        return this.source[this.position];
    }
    advance() {
        const char = this.source[this.position];
        this.position++;
        if (char === '\n') {
            this.line++;
            this.column = 1;
        }
        else {
            this.column++;
        }
        return char;
    }
    match(expected) {
        if (this.isAtEnd() || this.peek() !== expected)
            return false;
        this.advance();
        return true;
    }
    isAtEnd() {
        return this.position >= this.source.length;
    }
    isDigit(char) {
        return char >= '0' && char <= '9';
    }
    isHexDigit(char) {
        return this.isDigit(char) || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F');
    }
    isBinaryDigit(char) {
        return char === '0' || char === '1';
    }
    isIdentifierStart(char) {
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || char === '$';
    }
    isIdentifierPart(char) {
        return this.isIdentifierStart(char) || this.isDigit(char);
    }
    skipWhitespaceAndComments() {
        while (!this.isAtEnd()) {
            const char = this.peek();
            if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
                this.advance();
                continue;
            }
            if (char === '/' && this.position + 1 < this.source.length) {
                if (this.source[this.position + 1] === '/') {
                    this.skipLineComment();
                    continue;
                }
                if (this.source[this.position + 1] === '*') {
                    this.skipBlockComment();
                    continue;
                }
            }
            break;
        }
    }
    skipLineComment() {
        while (!this.isAtEnd() && this.peek() !== '\n')
            this.advance();
    }
    skipBlockComment() {
        this.advance();
        this.advance();
        const start_line = this.line;
        const start_column = this.column;
        while (!this.isAtEnd()) {
            if (this.peek() === '*' && this.position + 1 < this.source.length && this.source[this.position + 1] === '/') {
                this.advance();
                this.advance();
                return;
            }
            this.advance();
        }
        throw (0, compiler_error_1.lexerError)('Unterminated block comment', { line: start_line, column: start_column });
    }
}
exports.CharReader = CharReader;
//# sourceMappingURL=char-reader.js.map