import { Token, TokenKind } from '../lexer/token';
export declare class ParserBase {
    protected tokens: Token[];
    protected pos: number;
    constructor(tokens: Token[]);
    protected isAtEnd(): boolean;
    protected check(kind: TokenKind): boolean;
    protected checkValue(v: string): boolean;
    protected current(): Token;
    protected advance(): Token;
    protected expect(kind: TokenKind): Token;
    protected peekAhead(offset: number): Token | null;
    protected peekIsMethod(): boolean;
    protected skipToSemicolonOrBrace(): void;
    protected collectUntilSemicolon(): string;
    protected collectBalanced(open: TokenKind, close: TokenKind): string;
    protected isAttachable(v: string): boolean;
}
