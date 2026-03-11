// Unit tests for the Lexer stage.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Lexer } from '../src/lexer/lexer';
import { TokenKind } from '../src/lexer/token';
import { CompilerError } from '../src/errors/compiler-error';

// Helper: tokenize and return kinds (excluding EOF).
function tokenKinds(source: string): TokenKind[] {
  return new Lexer(source).tokenize().slice(0, -1).map(t => t.kind);
}

// Helper: tokenize and return first token.
function firstToken(source: string) {
  return new Lexer(source).tokenize()[0];
}

describe('Lexer', () => {
  describe('keywords', () => {
    const KEYWORD_CASES: [string, TokenKind][] = [
      ['const', TokenKind.Const],
      ['let', TokenKind.Let],
      ['function', TokenKind.Function],
      ['return', TokenKind.Return],
      ['if', TokenKind.If],
      ['else', TokenKind.Else],
      ['export', TokenKind.Export],
      ['number', TokenKind.NumberType],
      ['boolean', TokenKind.BooleanType],
      ['true', TokenKind.BooleanLiteral],
      ['false', TokenKind.BooleanLiteral],
    ];

    for (const [source, expected_kind] of KEYWORD_CASES) {
      it(`recognizes keyword "${source}"`, () => {
        assert.strictEqual(firstToken(source).kind, expected_kind);
      });
    }
  });

  describe('numeric literals', () => {
    it('tokenizes decimal integers', () => {
      const token = firstToken('42');
      assert.strictEqual(token.kind, TokenKind.NumberLiteral);
      assert.strictEqual(token.value, '42');
    });

    it('tokenizes hex literals', () => {
      const token = firstToken('0xFF');
      assert.strictEqual(token.kind, TokenKind.HexLiteral);
      assert.strictEqual(token.value, 'FF');
    });

    it('tokenizes binary literals', () => {
      const token = firstToken('0b1010');
      assert.strictEqual(token.kind, TokenKind.BinaryLiteral);
      assert.strictEqual(token.value, '1010');
    });

    it('strips underscores from numeric literals', () => {
      assert.strictEqual(firstToken('1_000').value, '1000');
    });

    it('errors on empty hex literal', () => {
      assert.throws(() => new Lexer('0x').tokenize(), (error: any) => {
        return error instanceof CompilerError && error.message.includes('Empty hex');
      });
    });

    it('errors on empty binary literal', () => {
      assert.throws(() => new Lexer('0b').tokenize(), (error: any) => {
        return error instanceof CompilerError && error.message.includes('Empty binary');
      });
    });
  });

  describe('operators', () => {
    const OPERATOR_CASES: [string, TokenKind][] = [
      ['+', TokenKind.Plus],
      ['-', TokenKind.Minus],
      ['*', TokenKind.Star],
      ['~', TokenKind.Tilde],
      ['&', TokenKind.Ampersand],
      ['|', TokenKind.Pipe],
      ['^', TokenKind.Caret],
      ['>>', TokenKind.ShiftRight],
      ['<<', TokenKind.ShiftLeft],
      ['===', TokenKind.StrictEqual],
      ['!==', TokenKind.StrictNotEqual],
      ['>', TokenKind.GreaterThan],
      ['<', TokenKind.LessThan],
      ['>=', TokenKind.GreaterThanOrEqual],
      ['<=', TokenKind.LessThanOrEqual],
      ['=', TokenKind.Equals],
    ];

    for (const [source, expected_kind] of OPERATOR_CASES) {
      it(`recognizes operator "${source}"`, () => {
        assert.strictEqual(firstToken(source).kind, expected_kind);
      });
    }
  });

  describe('punctuation', () => {
    const PUNCTUATION_CASES: [string, TokenKind][] = [
      ['(', TokenKind.LeftParen],
      [')', TokenKind.RightParen],
      ['{', TokenKind.LeftBrace],
      ['}', TokenKind.RightBrace],
      ['[', TokenKind.LeftBracket],
      [']', TokenKind.RightBracket],
      [':', TokenKind.Colon],
      [';', TokenKind.Semicolon],
      [',', TokenKind.Comma],
    ];

    for (const [source, expected_kind] of PUNCTUATION_CASES) {
      it(`recognizes "${source}"`, () => {
        assert.strictEqual(firstToken(source).kind, expected_kind);
      });
    }
  });

  describe('string literals', () => {
    it('tokenizes double-quoted strings', () => {
      const token = firstToken('"hello"');
      assert.strictEqual(token.kind, TokenKind.StringLiteral);
      assert.strictEqual(token.value, 'hello');
    });

    it('tokenizes single-quoted strings', () => {
      assert.strictEqual(firstToken("'world'").value, 'world');
    });

    it('errors on unterminated string', () => {
      assert.throws(() => new Lexer('"oops').tokenize(), (error: any) => {
        return error instanceof CompilerError && error.message.includes('Unterminated');
      });
    });
  });

  describe('comments', () => {
    it('skips line comments', () => {
      const kinds = tokenKinds('42 // this is a comment\n');
      assert.strictEqual(kinds.length, 1);
      assert.strictEqual(kinds[0], TokenKind.NumberLiteral);
    });

    it('skips block comments', () => {
      const kinds = tokenKinds('/* skip */ 42');
      assert.strictEqual(kinds.length, 1);
    });

    it('errors on unterminated block comment', () => {
      assert.throws(() => new Lexer('/* no end').tokenize(), (error: any) => {
        return error instanceof CompilerError;
      });
    });
  });

  describe('whitespace and line tracking', () => {
    it('tracks line numbers across newlines', () => {
      const tokens = new Lexer('a\nb\nc').tokenize();
      assert.strictEqual(tokens[0].line, 1);
      assert.strictEqual(tokens[1].line, 2);
      assert.strictEqual(tokens[2].line, 3);
    });

    it('tracks column positions', () => {
      const tokens = new Lexer('  abc').tokenize();
      assert.strictEqual(tokens[0].column, 3);
    });
  });

  describe('full tokenization', () => {
    it('tokenizes a variable declaration', () => {
      const kinds = tokenKinds('const x: number = 5;');
      assert.deepStrictEqual(kinds, [
        TokenKind.Const, TokenKind.Identifier, TokenKind.Colon,
        TokenKind.NumberType, TokenKind.Equals, TokenKind.NumberLiteral,
        TokenKind.Semicolon,
      ]);
    });

    it('always ends with EOF', () => {
      const tokens = new Lexer('').tokenize();
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0].kind, TokenKind.EndOfFile);
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const tokens = new Lexer('').tokenize();
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0].kind, TokenKind.EndOfFile);
    });

    it('errors on unexpected character', () => {
      assert.throws(() => new Lexer('#').tokenize(), (error: any) => {
        return error instanceof CompilerError && error.message.includes('Unexpected');
      });
    });
  });
});
