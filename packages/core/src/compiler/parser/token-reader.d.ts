import { Token, TokenKind } from '../lexer/token';
import { SourceLocation } from '../errors/compiler-error';
export declare class TokenReader {
    protected readonly tokens: Token[];
    protected position: number;
    constructor(tokens: Token[]);
    protected currentToken(): Token;
    protected currentLocation(): SourceLocation;
    protected advance(): Token;
    protected check(kind: TokenKind): boolean;
    protected expect(kind: TokenKind, description: string): Token;
    protected isAtEnd(): boolean;
}
