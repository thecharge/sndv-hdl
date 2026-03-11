// Unit tests for the Parser stage.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Lexer } from '../packages/core/src/compiler/lexer/lexer';
import { Parser } from '../packages/core/src/compiler/parser/parser';
import {
  AstNodeKind, TypeName, ProgramNode, FunctionDeclarationNode,
  BinaryExpressionNode, IdentifierNode, NumberLiteralNode,
} from '../packages/core/src/compiler/parser/ast';
import { CompilerError } from '../packages/core/src/compiler/errors/compiler-error';

// Helper: parse source into a ProgramNode.
function parseSource(source: string): ProgramNode {
  const tokens = new Lexer(source).tokenize();
  return new Parser(tokens).parse();
}

// Helper: extract the first function from parsed source.
function firstFunction(source: string): FunctionDeclarationNode {
  return parseSource(source).body[0];
}

describe('Parser', () => {
  describe('function declarations', () => {
    it('parses a minimal function', () => {
      const func = firstFunction('function foo() {}');
      assert.strictEqual(func.kind, AstNodeKind.FunctionDeclaration);
      assert.strictEqual(func.name, 'foo');
      assert.strictEqual(func.parameters.length, 0);
      assert.strictEqual(func.return_type, null);
    });

    it('parses parameters with type annotations', () => {
      const func = firstFunction('function add(a: number, b: number): number { return a; }');
      assert.strictEqual(func.parameters.length, 2);
      assert.strictEqual(func.parameters[0].name, 'a');
      assert.strictEqual(func.parameters[0].type_annotation.type_name, TypeName.Number);
      assert.strictEqual(func.parameters[1].name, 'b');
    });

    it('parses boolean parameter type', () => {
      const func = firstFunction('function test(flag: boolean) {}');
      assert.strictEqual(func.parameters[0].type_annotation.type_name, TypeName.Boolean);
    });

    it('parses return type annotation', () => {
      const func = firstFunction('function foo(): number { return 0; }');
      assert.ok(func.return_type);
      assert.strictEqual(func.return_type!.type_name, TypeName.Number);
    });

    it('parses exported functions', () => {
      const func = firstFunction('export function foo() {}');
      assert.strictEqual(func.is_exported, true);
    });

    it('parses multiple functions', () => {
      const program = parseSource('function a() {} function b() {}');
      assert.strictEqual(program.body.length, 2);
    });
  });

  describe('type annotations', () => {
    const TYPE_CASES: [string, TypeName][] = [
      ['number', TypeName.Number],
      ['boolean', TypeName.Boolean],
    ];

    for (const [type_string, expected_type] of TYPE_CASES) {
      it(`parses type "${type_string}"`, () => {
        const func = firstFunction(`function f(x: ${type_string}) {}`);
        assert.strictEqual(func.parameters[0].type_annotation.type_name, expected_type);
      });
    }

    it('parses array types', () => {
      const func = firstFunction('function f(arr: number[]) {}');
      assert.strictEqual(func.parameters[0].type_annotation.type_name, TypeName.NumberArray);
    });
  });

  describe('statements', () => {
    it('parses variable declarations with const', () => {
      const func = firstFunction('function f() { const x: number = 5; }');
      const stmt = func.body.statements[0];
      assert.strictEqual(stmt.kind, AstNodeKind.VariableDeclaration);
      if (stmt.kind === AstNodeKind.VariableDeclaration) {
        assert.strictEqual(stmt.is_const, true);
        assert.strictEqual(stmt.name, 'x');
      }
    });

    it('parses variable declarations with let', () => {
      const func = firstFunction('function f() { let y: number = 10; }');
      const stmt = func.body.statements[0];
      if (stmt.kind === AstNodeKind.VariableDeclaration) {
        assert.strictEqual(stmt.is_const, false);
      }
    });

    it('parses return statements', () => {
      const func = firstFunction('function f(): number { return 42; }');
      assert.strictEqual(func.body.statements[0].kind, AstNodeKind.ReturnStatement);
    });

    it('parses if/else statements', () => {
      const func = firstFunction('function f(x: boolean) { if (x) { return 1; } else { return 0; } }');
      const stmt = func.body.statements[0];
      assert.strictEqual(stmt.kind, AstNodeKind.IfStatement);
    });

    it('parses chained if/else if/else', () => {
      const source = 'function f(x: number) { if (x === 0) { return 0; } else if (x === 1) { return 1; } else { return 2; } }';
      const func = firstFunction(source);
      const stmt = func.body.statements[0];
      assert.strictEqual(stmt.kind, AstNodeKind.IfStatement);
      if (stmt.kind === AstNodeKind.IfStatement) {
        assert.ok(stmt.alternate);
        assert.strictEqual(stmt.alternate!.kind, AstNodeKind.IfStatement);
      }
    });
  });

  describe('expressions', () => {
    // Helper: extract expression from "function f(): number { return EXPR; }"
    function parseExpression(expr_source: string) {
      const func = firstFunction(`function f(): number { return ${expr_source}; }`);
      const ret = func.body.statements[0];
      if (ret.kind !== AstNodeKind.ReturnStatement) throw new Error('expected return');
      return ret.expression;
    }

    it('parses number literals', () => {
      const expr = parseExpression('42');
      assert.strictEqual(expr.kind, AstNodeKind.NumberLiteral);
      if (expr.kind === AstNodeKind.NumberLiteral) {
        assert.strictEqual(expr.value, 42);
      }
    });

    it('parses hex literals', () => {
      const expr = parseExpression('0xFF');
      assert.strictEqual(expr.kind, AstNodeKind.HexLiteral);
    });

    it('parses boolean literals', () => {
      const expr = parseExpression('true');
      assert.strictEqual(expr.kind, AstNodeKind.BooleanLiteral);
    });

    it('parses identifiers', () => {
      const func = firstFunction('function f(x: number): number { return x; }');
      const ret = func.body.statements[0];
      if (ret.kind === AstNodeKind.ReturnStatement) {
        assert.strictEqual(ret.expression.kind, AstNodeKind.Identifier);
      }
    });

    const BINARY_OPERATOR_CASES: [string, string][] = [
      ['a + b', '+'], ['a - b', '-'], ['a * b', '*'],
      ['a & b', '&'], ['a | b', '|'], ['a ^ b', '^'],
      ['a >> b', '>>'], ['a << b', '<<'],
      ['a === b', '==='], ['a !== b', '!=='],
      ['a > b', '>'], ['a < b', '<'],
      ['a >= b', '>='], ['a <= b', '<='],
    ];

    for (const [source, expected_op] of BINARY_OPERATOR_CASES) {
      it(`parses binary operator "${expected_op}"`, () => {
        const func = firstFunction(`function f(a: number, b: number): number { return ${source}; }`);
        const ret = func.body.statements[0];
        if (ret.kind === AstNodeKind.ReturnStatement && ret.expression.kind === AstNodeKind.BinaryExpression) {
          assert.strictEqual(ret.expression.operator, expected_op);
        }
      });
    }

    it('parses unary negation', () => {
      const expr = parseExpression('-42');
      assert.strictEqual(expr.kind, AstNodeKind.UnaryExpression);
    });

    it('parses bitwise not', () => {
      const expr = parseExpression('~x');
      assert.strictEqual(expr.kind, AstNodeKind.UnaryExpression);
    });

    it('parses parenthesized expressions', () => {
      const expr = parseExpression('(1 + 2)');
      assert.strictEqual(expr.kind, AstNodeKind.BinaryExpression);
    });

    it('parses array access', () => {
      const func = firstFunction('function f(arr: number[]): number { return arr[0]; }');
      const ret = func.body.statements[0];
      if (ret.kind === AstNodeKind.ReturnStatement) {
        assert.strictEqual(ret.expression.kind, AstNodeKind.ArrayAccess);
      }
    });

    it('parses array literals', () => {
      const func = firstFunction('function f() { const arr: number[] = [1, 2, 3]; }');
      const stmt = func.body.statements[0];
      if (stmt.kind === AstNodeKind.VariableDeclaration) {
        assert.strictEqual(stmt.initializer.kind, AstNodeKind.ArrayLiteral);
      }
    });

    it('respects operator precedence (multiply before add)', () => {
      const expr = parseExpression('1 + 2 * 3');
      assert.strictEqual(expr.kind, AstNodeKind.BinaryExpression);
      if (expr.kind === AstNodeKind.BinaryExpression) {
        assert.strictEqual(expr.operator, '+');
        assert.strictEqual(expr.right.kind, AstNodeKind.BinaryExpression);
      }
    });
  });

  describe('error handling', () => {
    it('errors on missing function keyword', () => {
      assert.throws(() => parseSource('foo() {}'), (error: any) => error instanceof CompilerError);
    });

    it('errors on missing closing brace', () => {
      assert.throws(() => parseSource('function f() {'), (error: any) => error instanceof CompilerError);
    });

    it('errors on missing semicolon', () => {
      assert.throws(() => parseSource('function f() { return 1 }'), (error: any) => error instanceof CompilerError);
    });

    it('errors on invalid type annotation', () => {
      assert.throws(() => parseSource('function f(x: string) {}'), (error: any) => {
        return error instanceof CompilerError && error.message.includes('Expected type');
      });
    });
  });
});
