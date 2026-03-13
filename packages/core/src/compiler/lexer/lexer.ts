// Lexer: converts TypeScript source text into a stream of tokens.

import { Token, TokenKind, KEYWORD_TOKEN_MAP } from './token';
import { lexerError } from '../errors/compiler-error';
import { CharReader } from './char-reader';

export class Lexer extends CharReader {

  constructor(source: string) {
    super(source);
  }

  /**
   * Tokenize the entire source into a token array.
   * @returns Array of tokens ending with EndOfFile.
   * @example
   *   const tokens = new Lexer('const x: number = 5;').tokenize();
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (true) {
      const token = this.nextToken();
      tokens.push(token);
      if (token.kind === TokenKind.EndOfFile) break;
    }
    return tokens;
  }

  private nextToken(): Token {
    this.skipWhitespaceAndComments();
    if (this.isAtEnd()) return this.makeToken(TokenKind.EndOfFile, '');
    const char = this.peek();
    if (char >= '0' && char <= '9') return this.readNumber();
    if (this.isIdentifierStart(char)) return this.readIdentifierOrKeyword();
    if (char === '"' || char === "'") return this.readString();
    return this.readOperatorOrPunctuation();
  }

  private readNumber(): Token {
    const start_line = this.line;
    const start_column = this.column;
    if (this.peek() === '0' && this.position + 1 < this.source.length) {
      const next = this.source[this.position + 1];
      if (next === 'x' || next === 'X') return this.readHexLiteral(start_line, start_column);
      if (next === 'b' || next === 'B') return this.readBinaryLiteral(start_line, start_column);
    }
    let value = '';
    while (!this.isAtEnd() && (this.isDigit(this.peek()) || this.peek() === '_')) {
      if (this.peek() !== '_') value += this.peek();
      this.advance();
    }
    return { kind: TokenKind.NumberLiteral, value, line: start_line, column: start_column };
  }

  private readHexLiteral(start_line: number, start_column: number): Token {
    this.advance(); this.advance();
    let value = '';
    while (!this.isAtEnd() && (this.isHexDigit(this.peek()) || this.peek() === '_')) {
      if (this.peek() !== '_') value += this.peek();
      this.advance();
    }
    if (value.length === 0) throw lexerError('Empty hex literal', { line: start_line, column: start_column });
    return { kind: TokenKind.HexLiteral, value, line: start_line, column: start_column };
  }

  private readBinaryLiteral(start_line: number, start_column: number): Token {
    this.advance(); this.advance();
    let value = '';
    while (!this.isAtEnd() && (this.isBinaryDigit(this.peek()) || this.peek() === '_')) {
      if (this.peek() !== '_') value += this.peek();
      this.advance();
    }
    if (value.length === 0) throw lexerError('Empty binary literal', { line: start_line, column: start_column });
    return { kind: TokenKind.BinaryLiteral, value, line: start_line, column: start_column };
  }

  private readIdentifierOrKeyword(): Token {
    const start_line = this.line;
    const start_column = this.column;
    let value = '';
    while (!this.isAtEnd() && this.isIdentifierPart(this.peek())) { value += this.peek(); this.advance(); }
    const keyword_kind = KEYWORD_TOKEN_MAP.get(value);
    if (keyword_kind !== undefined) return { kind: keyword_kind, value, line: start_line, column: start_column };
    return { kind: TokenKind.Identifier, value, line: start_line, column: start_column };
  }

  private readString(): Token {
    const start_line = this.line;
    const start_column = this.column;
    const quote = this.peek();
    this.advance();
    let value = '';
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') { this.advance(); if (this.isAtEnd()) break; }
      value += this.peek();
      this.advance();
    }
    if (this.isAtEnd()) throw lexerError('Unterminated string literal', { line: start_line, column: start_column });
    this.advance();
    return { kind: TokenKind.StringLiteral, value, line: start_line, column: start_column };
  }

  private readOperatorOrPunctuation(): Token {
    const start_line = this.line;
    const start_column = this.column;
    const char = this.advance();
    const at = (kind: TokenKind, value: string) => ({ kind, value, line: start_line, column: start_column });

    switch (char) {
      case '@': return at(TokenKind.At, '@');
      case '.': return at(TokenKind.Dot, '.');
      case '+':
        if (!this.isAtEnd() && this.peek() === '+') { this.advance(); return at(TokenKind.PlusPlus, '++'); }
        if (!this.isAtEnd() && this.peek() === '=') { this.advance(); return at(TokenKind.PlusEquals, '+='); }
        return at(TokenKind.Plus, '+');
      case '-':
        if (!this.isAtEnd() && this.peek() === '-') { this.advance(); return at(TokenKind.MinusMinus, '--'); }
        if (!this.isAtEnd() && this.peek() === '=') { this.advance(); return at(TokenKind.MinusEquals, '-='); }
        return at(TokenKind.Minus, '-');
      case '*': return at(TokenKind.Star, '*');
      case '~': return at(TokenKind.Tilde, '~');
      case '&':
        if (!this.isAtEnd() && this.peek() === '&') { this.advance(); return at(TokenKind.Ampersand, '&&'); }
        return at(TokenKind.Ampersand, '&');
      case '|':
        if (!this.isAtEnd() && this.peek() === '|') { this.advance(); return at(TokenKind.Pipe, '||'); }
        return at(TokenKind.Pipe, '|');
      case '^': return at(TokenKind.Caret, '^');
      case '(': return at(TokenKind.LeftParen, '(');
      case ')': return at(TokenKind.RightParen, ')');
      case '{': return at(TokenKind.LeftBrace, '{');
      case '}': return at(TokenKind.RightBrace, '}');
      case '[': return at(TokenKind.LeftBracket, '[');
      case ']': return at(TokenKind.RightBracket, ']');
      case ':': return at(TokenKind.Colon, ':');
      case ';': return at(TokenKind.Semicolon, ';');
      case ',': return at(TokenKind.Comma, ',');
      case '=':
        if (this.match('=') && this.match('=')) return at(TokenKind.StrictEqual, '===');
        return at(TokenKind.Equals, '=');
      case '!':
        if (!this.isAtEnd() && this.peek() === '=' && this.position + 1 < this.source.length && this.source[this.position + 1] === '=') {
          this.advance(); this.advance(); return at(TokenKind.StrictNotEqual, '!==');
        }
        return at(TokenKind.Not, '!');
      case '>':
        if (!this.isAtEnd() && this.peek() === '>') {
          this.advance();
          if (!this.isAtEnd() && this.peek() === '>') {
            this.advance();
            return at(TokenKind.ArithmeticShiftRight, '>>>');
          }
          return at(TokenKind.ShiftRight, '>>');
        }
        if (this.match('=')) return at(TokenKind.GreaterThanOrEqual, '>=');
        return at(TokenKind.GreaterThan, '>');
      case '<':
        if (this.match('<')) return at(TokenKind.ShiftLeft, '<<');
        if (this.match('=')) return at(TokenKind.LessThanOrEqual, '<=');
        return at(TokenKind.LessThan, '<');
      default:
        throw lexerError(`Unexpected character "${char}"`, { line: start_line, column: start_column });
    }
  }

  private makeToken(kind: TokenKind, value: string): Token {
    return { kind, value, line: this.line, column: this.column };
  }
}
