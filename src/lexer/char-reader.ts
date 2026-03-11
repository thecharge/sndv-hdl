// Character-level source reader with position, line, and column tracking.

import { lexerError } from '../errors/compiler-error';

export class CharReader {
  protected readonly source: string;
  protected position: number = 0;
  protected line: number = 1;
  protected column: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  protected peek(): string {
    return this.source[this.position];
  }

  protected advance(): string {
    const char = this.source[this.position];
    this.position++;
    if (char === '\n') { this.line++; this.column = 1; }
    else { this.column++; }
    return char;
  }

  protected match(expected: string): boolean {
    if (this.isAtEnd() || this.peek() !== expected) return false;
    this.advance();
    return true;
  }

  protected isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  protected isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  protected isHexDigit(char: string): boolean {
    return this.isDigit(char) || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F');
  }

  protected isBinaryDigit(char: string): boolean {
    return char === '0' || char === '1';
  }

  protected isIdentifierStart(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || char === '$';
  }

  protected isIdentifierPart(char: string): boolean {
    return this.isIdentifierStart(char) || this.isDigit(char);
  }

  protected skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') { this.advance(); continue; }
      if (char === '/' && this.position + 1 < this.source.length) {
        if (this.source[this.position + 1] === '/') { this.skipLineComment(); continue; }
        if (this.source[this.position + 1] === '*') { this.skipBlockComment(); continue; }
      }
      break;
    }
  }

  private skipLineComment(): void {
    while (!this.isAtEnd() && this.peek() !== '\n') this.advance();
  }

  private skipBlockComment(): void {
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
    throw lexerError('Unterminated block comment', { line: start_line, column: start_column });
  }
}
