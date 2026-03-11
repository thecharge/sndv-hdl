// Navigable token stream with position tracking and lookahead helpers.

import { Token, TokenKind } from '../lexer/token';
import { parserError, SourceLocation } from '../errors/compiler-error';

export class TokenReader {
  protected readonly tokens: Token[];
  protected position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  protected currentToken(): Token {
    return this.tokens[this.position];
  }

  protected currentLocation(): SourceLocation {
    const token = this.currentToken();
    return { line: token.line, column: token.column };
  }

  protected advance(): Token {
    const token = this.currentToken();
    this.position++;
    return token;
  }

  protected check(kind: TokenKind): boolean {
    return this.currentToken().kind === kind;
  }

  protected expect(kind: TokenKind, description: string): Token {
    if (this.check(kind)) return this.advance();
    const token = this.currentToken();
    throw parserError(
      `Expected ${description} but found "${token.value}"`,
      { line: token.line, column: token.column },
    );
  }

  protected isAtEnd(): boolean {
    return this.currentToken().kind === TokenKind.EndOfFile;
  }
}
