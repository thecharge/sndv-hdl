"use strict";
// Lexer: converts TypeScript source text into a stream of tokens.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = void 0;
const token_1 = require("./token");
const compiler_error_1 = require("../errors/compiler-error");
const char_reader_1 = require("./char-reader");
class Lexer extends char_reader_1.CharReader {
    constructor(source) {
        super(source);
    }
    /**
     * Tokenize the entire source into a token array.
     * @returns Array of tokens ending with EndOfFile.
     * @example
     *   const tokens = new Lexer('const x: number = 5;').tokenize();
     */
    tokenize() {
        const tokens = [];
        while (true) {
            const token = this.nextToken();
            tokens.push(token);
            if (token.kind === token_1.TokenKind.EndOfFile)
                break;
        }
        return tokens;
    }
    nextToken() {
        this.skipWhitespaceAndComments();
        if (this.isAtEnd())
            return this.makeToken(token_1.TokenKind.EndOfFile, '');
        const char = this.peek();
        if (char >= '0' && char <= '9')
            return this.readNumber();
        if (this.isIdentifierStart(char))
            return this.readIdentifierOrKeyword();
        if (char === '"' || char === "'")
            return this.readString();
        return this.readOperatorOrPunctuation();
    }
    readNumber() {
        const start_line = this.line;
        const start_column = this.column;
        if (this.peek() === '0' && this.position + 1 < this.source.length) {
            const next = this.source[this.position + 1];
            if (next === 'x' || next === 'X')
                return this.readHexLiteral(start_line, start_column);
            if (next === 'b' || next === 'B')
                return this.readBinaryLiteral(start_line, start_column);
        }
        let value = '';
        while (!this.isAtEnd() && (this.isDigit(this.peek()) || this.peek() === '_')) {
            if (this.peek() !== '_')
                value += this.peek();
            this.advance();
        }
        return { kind: token_1.TokenKind.NumberLiteral, value, line: start_line, column: start_column };
    }
    readHexLiteral(start_line, start_column) {
        this.advance();
        this.advance();
        let value = '';
        while (!this.isAtEnd() && (this.isHexDigit(this.peek()) || this.peek() === '_')) {
            if (this.peek() !== '_')
                value += this.peek();
            this.advance();
        }
        if (value.length === 0)
            throw (0, compiler_error_1.lexerError)('Empty hex literal', { line: start_line, column: start_column });
        return { kind: token_1.TokenKind.HexLiteral, value, line: start_line, column: start_column };
    }
    readBinaryLiteral(start_line, start_column) {
        this.advance();
        this.advance();
        let value = '';
        while (!this.isAtEnd() && (this.isBinaryDigit(this.peek()) || this.peek() === '_')) {
            if (this.peek() !== '_')
                value += this.peek();
            this.advance();
        }
        if (value.length === 0)
            throw (0, compiler_error_1.lexerError)('Empty binary literal', { line: start_line, column: start_column });
        return { kind: token_1.TokenKind.BinaryLiteral, value, line: start_line, column: start_column };
    }
    readIdentifierOrKeyword() {
        const start_line = this.line;
        const start_column = this.column;
        let value = '';
        while (!this.isAtEnd() && this.isIdentifierPart(this.peek())) {
            value += this.peek();
            this.advance();
        }
        const keyword_kind = token_1.KEYWORD_TOKEN_MAP.get(value);
        if (keyword_kind !== undefined)
            return { kind: keyword_kind, value, line: start_line, column: start_column };
        return { kind: token_1.TokenKind.Identifier, value, line: start_line, column: start_column };
    }
    readString() {
        const start_line = this.line;
        const start_column = this.column;
        const quote = this.peek();
        this.advance();
        let value = '';
        while (!this.isAtEnd() && this.peek() !== quote) {
            if (this.peek() === '\\') {
                this.advance();
                if (this.isAtEnd())
                    break;
            }
            value += this.peek();
            this.advance();
        }
        if (this.isAtEnd())
            throw (0, compiler_error_1.lexerError)('Unterminated string literal', { line: start_line, column: start_column });
        this.advance();
        return { kind: token_1.TokenKind.StringLiteral, value, line: start_line, column: start_column };
    }
    readOperatorOrPunctuation() {
        const start_line = this.line;
        const start_column = this.column;
        const char = this.advance();
        const at = (kind, value) => ({ kind, value, line: start_line, column: start_column });
        switch (char) {
            case '@': return at(token_1.TokenKind.At, '@');
            case '.': return at(token_1.TokenKind.Dot, '.');
            case '+':
                if (!this.isAtEnd() && this.peek() === '+') {
                    this.advance();
                    return at(token_1.TokenKind.PlusPlus, '++');
                }
                if (!this.isAtEnd() && this.peek() === '=') {
                    this.advance();
                    return at(token_1.TokenKind.PlusEquals, '+=');
                }
                return at(token_1.TokenKind.Plus, '+');
            case '-':
                if (!this.isAtEnd() && this.peek() === '-') {
                    this.advance();
                    return at(token_1.TokenKind.MinusMinus, '--');
                }
                if (!this.isAtEnd() && this.peek() === '=') {
                    this.advance();
                    return at(token_1.TokenKind.MinusEquals, '-=');
                }
                return at(token_1.TokenKind.Minus, '-');
            case '*': return at(token_1.TokenKind.Star, '*');
            case '~': return at(token_1.TokenKind.Tilde, '~');
            case '&':
                if (!this.isAtEnd() && this.peek() === '&') {
                    this.advance();
                    return at(token_1.TokenKind.Ampersand, '&&');
                }
                return at(token_1.TokenKind.Ampersand, '&');
            case '|':
                if (!this.isAtEnd() && this.peek() === '|') {
                    this.advance();
                    return at(token_1.TokenKind.Pipe, '||');
                }
                return at(token_1.TokenKind.Pipe, '|');
            case '^': return at(token_1.TokenKind.Caret, '^');
            case '(': return at(token_1.TokenKind.LeftParen, '(');
            case ')': return at(token_1.TokenKind.RightParen, ')');
            case '{': return at(token_1.TokenKind.LeftBrace, '{');
            case '}': return at(token_1.TokenKind.RightBrace, '}');
            case '[': return at(token_1.TokenKind.LeftBracket, '[');
            case ']': return at(token_1.TokenKind.RightBracket, ']');
            case ':': return at(token_1.TokenKind.Colon, ':');
            case ';': return at(token_1.TokenKind.Semicolon, ';');
            case ',': return at(token_1.TokenKind.Comma, ',');
            case '=':
                if (this.match('=') && this.match('='))
                    return at(token_1.TokenKind.StrictEqual, '===');
                return at(token_1.TokenKind.Equals, '=');
            case '!':
                if (!this.isAtEnd() && this.peek() === '=' && this.position + 1 < this.source.length && this.source[this.position + 1] === '=') {
                    this.advance();
                    this.advance();
                    return at(token_1.TokenKind.StrictNotEqual, '!==');
                }
                return at(token_1.TokenKind.Not, '!');
            case '>':
                if (!this.isAtEnd() && this.peek() === '>') {
                    this.advance();
                    if (!this.isAtEnd() && this.peek() === '>') {
                        this.advance();
                        return at(token_1.TokenKind.ArithmeticShiftRight, '>>>');
                    }
                    return at(token_1.TokenKind.ShiftRight, '>>');
                }
                if (this.match('='))
                    return at(token_1.TokenKind.GreaterThanOrEqual, '>=');
                return at(token_1.TokenKind.GreaterThan, '>');
            case '<':
                if (this.match('<'))
                    return at(token_1.TokenKind.ShiftLeft, '<<');
                if (this.match('='))
                    return at(token_1.TokenKind.LessThanOrEqual, '<=');
                return at(token_1.TokenKind.LessThan, '<');
            default:
                throw (0, compiler_error_1.lexerError)(`Unexpected character "${char}"`, { line: start_line, column: start_column });
        }
    }
    makeToken(kind, value) {
        return { kind, value, line: this.line, column: this.column };
    }
}
exports.Lexer = Lexer;
//# sourceMappingURL=lexer.js.map