// Unit tests for the TypeChecker stage.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Lexer } from '../packages/core/src/compiler/lexer/lexer';
import { Parser } from '../packages/core/src/compiler/parser/parser';
import { TypeChecker, CheckedFunction } from '../packages/core/src/compiler/typechecker/typechecker';
import { DEFAULT_BIT_WIDTH, BOOLEAN_BIT_WIDTH } from '../packages/core/src/compiler/constants/defaults';
import { CompilerError } from '../packages/core/src/compiler/errors/compiler-error';

// Helper: type-check source and return checked functions.
function checkSource(source: string): CheckedFunction[] {
  const tokens = new Lexer(source).tokenize();
  const ast = new Parser(tokens).parse();
  return new TypeChecker().check(ast);
}

// Helper: check source and return the first function.
function checkFirst(source: string): CheckedFunction {
  return checkSource(source)[0];
}

describe('TypeChecker', () => {
  describe('parameter type resolution', () => {
    it('resolves number parameters to 32-bit width', () => {
      const func = checkFirst('function f(x: number) {}');
      assert.strictEqual(func.parameters[0].hardware_type.bit_width, DEFAULT_BIT_WIDTH);
    });

    it('resolves boolean parameters to 1-bit width', () => {
      const func = checkFirst('function f(flag: boolean) {}');
      assert.strictEqual(func.parameters[0].hardware_type.bit_width, BOOLEAN_BIT_WIDTH);
    });

    it('marks number types as signed', () => {
      const func = checkFirst('function f(x: number) {}');
      assert.strictEqual(func.parameters[0].hardware_type.is_signed, true);
    });

    it('marks boolean types as unsigned', () => {
      const func = checkFirst('function f(flag: boolean) {}');
      assert.strictEqual(func.parameters[0].hardware_type.is_signed, false);
    });
  });

  describe('return type resolution', () => {
    it('resolves explicit return type', () => {
      const func = checkFirst('function f(): number { return 0; }');
      assert.strictEqual(func.return_type.bit_width, DEFAULT_BIT_WIDTH);
    });

    it('defaults to number when no return type', () => {
      const func = checkFirst('function f() { return 0; }');
      assert.strictEqual(func.return_type.bit_width, DEFAULT_BIT_WIDTH);
    });
  });

  describe('local variable tracking', () => {
    it('tracks const declarations', () => {
      const func = checkFirst('function f() { const x: number = 5; }');
      assert.strictEqual(func.locals.length, 1);
      assert.strictEqual(func.locals[0].name, 'x');
      assert.strictEqual(func.locals[0].is_const, true);
    });

    it('tracks let declarations', () => {
      const func = checkFirst('function f() { let y: number = 10; }');
      assert.strictEqual(func.locals[0].is_const, false);
    });

    it('resolves type from annotation', () => {
      const func = checkFirst('function f() { const flag: boolean = true; }');
      assert.strictEqual(func.locals[0].hardware_type.bit_width, BOOLEAN_BIT_WIDTH);
    });
  });

  describe('expression type inference', () => {
    it('infers comparison result as boolean', () => {
      const func = checkFirst('function f(a: number, b: number): boolean { return a === b; }');
      assert.strictEqual(func.return_type.bit_width, BOOLEAN_BIT_WIDTH);
    });

    it('checks multiple functions independently', () => {
      const funcs = checkSource('function a(x: number) {} function b(y: boolean) {}');
      assert.strictEqual(funcs.length, 2);
      assert.strictEqual(funcs[0].parameters[0].hardware_type.bit_width, DEFAULT_BIT_WIDTH);
      assert.strictEqual(funcs[1].parameters[0].hardware_type.bit_width, BOOLEAN_BIT_WIDTH);
    });
  });

  describe('error detection', () => {
    it('errors on undeclared variable', () => {
      assert.throws(
        () => checkSource('function f(): number { return x; }'),
        (error: any) => error instanceof CompilerError && error.message.includes('Undeclared'),
      );
    });

    it('errors on duplicate declaration in same scope', () => {
      assert.throws(
        () => checkSource('function f() { const x: number = 1; const x: number = 2; }'),
        (error: any) => error instanceof CompilerError && error.message.includes('Duplicate'),
      );
    });

    it('errors on const reassignment', () => {
      assert.throws(
        () => checkSource('function f() { const x: number = 1; x = 2; }'),
        (error: any) => error instanceof CompilerError && error.message.includes('const'),
      );
    });

    it('errors on empty array literal', () => {
      assert.throws(
        () => checkSource('function f() { const arr: number[] = []; }'),
        (error: any) => error instanceof CompilerError && error.message.includes('Empty array'),
      );
    });
  });

  describe('array types', () => {
    it('resolves array element types', () => {
      const func = checkFirst('function f() { const arr: number[] = [1, 2, 3]; }');
      assert.ok(func.locals[0].hardware_type.array_size);
      assert.strictEqual(func.locals[0].hardware_type.array_size, 3);
    });
  });
});
