"use strict";
// Token-navigation base class shared by all parser layers.
// Handles token stream traversal, lookahead, and collection helpers.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserBase = void 0;
const token_1 = require("../lexer/token");
class ParserBase {
    tokens;
    pos = 0;
    constructor(tokens) {
        this.tokens = tokens;
    }
    isAtEnd() {
        return this.pos >= this.tokens.length || this.tokens[this.pos].kind === token_1.TokenKind.EndOfFile;
    }
    check(kind) {
        return !this.isAtEnd() && this.tokens[this.pos].kind === kind;
    }
    checkValue(v) {
        return !this.isAtEnd() && this.tokens[this.pos].value === v;
    }
    current() {
        return this.tokens[this.pos];
    }
    advance() {
        return this.tokens[this.pos++];
    }
    expect(kind) {
        if (!this.check(kind)) {
            const t = this.current();
            throw new Error(`Expected ${kind} but got ${t.kind} ("${t.value}") at line ${t.line}, col ${t.column}`);
        }
        return this.advance();
    }
    peekAhead(offset) {
        const idx = this.pos + offset;
        if (idx >= this.tokens.length)
            return null;
        return this.tokens[idx];
    }
    peekIsMethod() {
        let i = this.pos;
        if (this.tokens[i].kind === token_1.TokenKind.Private || this.tokens[i].kind === token_1.TokenKind.Public)
            i++;
        if (this.tokens[i].kind === token_1.TokenKind.Async)
            i++;
        if (i < this.tokens.length && this.tokens[i].kind === token_1.TokenKind.Identifier)
            i++;
        return i < this.tokens.length && this.tokens[i].kind === token_1.TokenKind.LeftParen;
    }
    skipToSemicolonOrBrace() {
        while (!this.isAtEnd() && !this.check(token_1.TokenKind.Semicolon) && !this.check(token_1.TokenKind.LeftBrace)) {
            this.advance();
        }
        if (this.check(token_1.TokenKind.Semicolon)) {
            this.advance();
        }
        else if (this.check(token_1.TokenKind.LeftBrace)) {
            let depth = 1;
            this.advance();
            while (depth > 0 && !this.isAtEnd()) {
                if (this.check(token_1.TokenKind.LeftBrace))
                    depth++;
                if (this.check(token_1.TokenKind.RightBrace))
                    depth--;
                this.advance();
            }
        }
    }
    collectUntilSemicolon() {
        let result = '';
        let depth = 0;
        while (!this.isAtEnd()) {
            if (depth === 0 && this.check(token_1.TokenKind.Semicolon))
                break;
            if (this.check(token_1.TokenKind.LeftParen) || this.check(token_1.TokenKind.LeftBracket) || this.check(token_1.TokenKind.LeftBrace))
                depth++;
            if (this.check(token_1.TokenKind.RightParen) || this.check(token_1.TokenKind.RightBracket) || this.check(token_1.TokenKind.RightBrace))
                depth--;
            const t = this.advance();
            let v = t.value;
            if (t.kind === token_1.TokenKind.HexLiteral)
                v = '0x' + v;
            if (t.kind === token_1.TokenKind.BinaryLiteral)
                v = '0b' + v;
            const noSpaceBefore = this.isAttachable(v);
            const noSpaceAfter = result.endsWith('.') || result.endsWith('(') || result.endsWith('[') ||
                result.endsWith('!') || result.endsWith('~');
            if (result === '' || noSpaceBefore || noSpaceAfter || v === '!' || v === '~') {
                result += v;
            }
            else {
                result += ' ' + v;
            }
        }
        return result.trim();
    }
    collectBalanced(open, close) {
        let result = '';
        let depth = 1;
        while (depth > 0 && !this.isAtEnd()) {
            if (this.current().kind === open)
                depth++;
            if (this.current().kind === close) {
                depth--;
                if (depth === 0)
                    break;
            }
            const t = this.advance();
            let v = t.value;
            if (t.kind === token_1.TokenKind.HexLiteral)
                v = '0x' + v;
            if (t.kind === token_1.TokenKind.BinaryLiteral)
                v = '0b' + v;
            const noSpaceBefore = this.isAttachable(v);
            const noSpaceAfter = result.endsWith('.') || result.endsWith('(') || result.endsWith('[') ||
                result.endsWith('!') || result.endsWith('~');
            if (result === '' || noSpaceBefore || noSpaceAfter || v === '!' || v === '~') {
                result += v;
            }
            else {
                result += ' ' + v;
            }
        }
        return result.trim();
    }
    isAttachable(v) {
        return v === '.' || v === '(' || v === ')' || v === '[' || v === ']' || v === ',';
    }
}
exports.ParserBase = ParserBase;
//# sourceMappingURL=class-module-parser-base.js.map