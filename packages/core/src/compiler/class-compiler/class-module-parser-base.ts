// Token-navigation base class shared by all parser layers.
// Handles token stream traversal, lookahead, and collection helpers.

import { Token, TokenKind } from '../lexer/token';

export class ParserBase {
    protected tokens: Token[];
    protected pos: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    protected isAtEnd(): boolean {
        return this.pos >= this.tokens.length || this.tokens[this.pos].kind === TokenKind.EndOfFile;
    }

    protected check(kind: TokenKind): boolean {
        return !this.isAtEnd() && this.tokens[this.pos].kind === kind;
    }

    protected checkValue(v: string): boolean {
        return !this.isAtEnd() && this.tokens[this.pos].value === v;
    }

    protected current(): Token {
        return this.tokens[this.pos];
    }

    protected advance(): Token {
        return this.tokens[this.pos++];
    }

    protected expect(kind: TokenKind): Token {
        if (!this.check(kind)) {
            const t = this.current();
            throw new Error(`Expected ${kind} but got ${t.kind} ("${t.value}") at line ${t.line}, col ${t.column}`);
        }
        return this.advance();
    }

    protected peekAhead(offset: number): Token | null {
        const idx = this.pos + offset;
        if (idx >= this.tokens.length) return null;
        return this.tokens[idx];
    }

    protected peekIsMethod(): boolean {
        let i = this.pos;
        if (this.tokens[i].kind === TokenKind.Private || this.tokens[i].kind === TokenKind.Public) i++;
        if (this.tokens[i].kind === TokenKind.Async) i++;
        if (i < this.tokens.length && this.tokens[i].kind === TokenKind.Identifier) i++;
        return i < this.tokens.length && this.tokens[i].kind === TokenKind.LeftParen;
    }

    protected skipToSemicolonOrBrace(): void {
        while (!this.isAtEnd() && !this.check(TokenKind.Semicolon) && !this.check(TokenKind.LeftBrace)) {
            this.advance();
        }
        if (this.check(TokenKind.Semicolon)) {
            this.advance();
        } else if (this.check(TokenKind.LeftBrace)) {
            let depth = 1;
            this.advance();
            while (depth > 0 && !this.isAtEnd()) {
                if (this.check(TokenKind.LeftBrace)) depth++;
                if (this.check(TokenKind.RightBrace)) depth--;
                this.advance();
            }
        }
    }

    protected collectUntilSemicolon(): string {
        let result = '';
        let depth = 0;
        while (!this.isAtEnd()) {
            if (depth === 0 && this.check(TokenKind.Semicolon)) break;
            if (this.check(TokenKind.LeftParen) || this.check(TokenKind.LeftBracket) || this.check(TokenKind.LeftBrace)) depth++;
            if (this.check(TokenKind.RightParen) || this.check(TokenKind.RightBracket) || this.check(TokenKind.RightBrace)) depth--;
            const t = this.advance();
            let v = t.value;
            if (t.kind === TokenKind.HexLiteral) v = '0x' + v;
            if (t.kind === TokenKind.BinaryLiteral) v = '0b' + v;
            const noSpaceBefore = this.isAttachable(v);
            const noSpaceAfter =
                result.endsWith('.') || result.endsWith('(') || result.endsWith('[') ||
                result.endsWith('!') || result.endsWith('~');
            if (result === '' || noSpaceBefore || noSpaceAfter || v === '!' || v === '~') {
                result += v;
            } else {
                result += ' ' + v;
            }
        }
        return result.trim();
    }

    protected collectBalanced(open: TokenKind, close: TokenKind): string {
        let result = '';
        let depth = 1;
        while (depth > 0 && !this.isAtEnd()) {
            if (this.current().kind === open) depth++;
            if (this.current().kind === close) {
                depth--;
                if (depth === 0) break;
            }
            const t = this.advance();
            let v = t.value;
            if (t.kind === TokenKind.HexLiteral) v = '0x' + v;
            if (t.kind === TokenKind.BinaryLiteral) v = '0b' + v;
            const noSpaceBefore = this.isAttachable(v);
            const noSpaceAfter =
                result.endsWith('.') || result.endsWith('(') || result.endsWith('[') ||
                result.endsWith('!') || result.endsWith('~');
            if (result === '' || noSpaceBefore || noSpaceAfter || v === '!' || v === '~') {
                result += v;
            } else {
                result += ' ' + v;
            }
        }
        return result.trim();
    }

    protected isAttachable(v: string): boolean {
        return v === '.' || v === '(' || v === ')' || v === '[' || v === ']' || v === ',';
    }
}
