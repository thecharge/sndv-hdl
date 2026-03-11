// Integration tests: full pipeline from TypeScript source to Verilog output.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CompilerPipeline } from '../src/pipeline/compiler-pipeline';

const pipeline = new CompilerPipeline();

describe('Integration: full pipeline', () => {
  describe('simple functions', () => {
    const SIMPLE_CASES: { name: string; source: string; fragments: string[] }[] = [
      {
        name: 'adder',
        source: 'function add(a: number, b: number): number { return a + b; }',
        fragments: ['module add', 'input  wire [31:0] a', 'input  wire [31:0] b', 'output wire [31:0] result', 'assign result = (a + b)', 'endmodule'],
      },
      {
        name: 'identity',
        source: 'function passthrough(x: number): number { return x; }',
        fragments: ['module passthrough', 'assign result = x'],
      },
      {
        name: 'bitwise AND',
        source: 'function mask(val: number, m: number): number { return val & m; }',
        fragments: ['assign result = (val & m)'],
      },
      {
        name: 'boolean return',
        source: 'function is_equal(a: number, b: number): boolean { return a === b; }',
        fragments: ['output wire  result', '(a == b)'],
      },
    ];

    for (const { name, source, fragments } of SIMPLE_CASES) {
      it(`compiles "${name}" correctly`, () => {
        const result = pipeline.compile(source);
        assert.strictEqual(result.success, true, `Compile failed: ${result.errors.map(e => e.message).join(', ')}`);
        for (const fragment of fragments) {
          assert.ok(result.verilog.includes(fragment), `Missing "${fragment}" in output:\n${result.verilog}`);
        }
      });
    }
  });

  describe('conditional logic (mux)', () => {
    it('compiles if/else into ternary mux', () => {
      const source = `
        function mux2(sel: boolean, a: number, b: number): number {
          if (sel) { return a; } else { return b; }
        }
      `;
      const result = pipeline.compile(source);
      assert.strictEqual(result.success, true);
      assert.ok(result.verilog.includes('?'), 'Expected ternary in output');
      assert.ok(result.verilog.includes('module mux2'));
    });
  });

  describe('local variables', () => {
    it('compiles intermediate wires', () => {
      const source = `
        function alu(a: number, b: number): number {
          const sum: number = a + b;
          const masked: number = sum & 0xFF;
          return masked;
        }
      `;
      const result = pipeline.compile(source);
      assert.strictEqual(result.success, true);
      assert.ok(result.verilog.includes('wire [31:0] sum'));
      assert.ok(result.verilog.includes('wire [31:0] masked'));
      assert.ok(result.verilog.includes('assign sum ='));
      assert.ok(result.verilog.includes('assign masked ='));
    });
  });

  describe('complex expressions', () => {
    it('handles nested binary operations', () => {
      const source = 'function f(a: number, b: number, c: number): number { return (a + b) * c; }';
      const result = pipeline.compile(source);
      assert.strictEqual(result.success, true);
      assert.ok(result.verilog.includes('((a + b) * c)'));
    });

    it('handles unary operators', () => {
      const source = 'function inv(x: number): number { return ~x; }';
      const result = pipeline.compile(source);
      assert.strictEqual(result.success, true);
      assert.ok(result.verilog.includes('(~x)'));
    });

    it('handles shift operations', () => {
      const source = 'function shl(x: number, n: number): number { return x << n; }';
      const result = pipeline.compile(source);
      assert.strictEqual(result.success, true);
      assert.ok(result.verilog.includes('(x << n)'));
    });
  });

  describe('error propagation', () => {
    it('returns error for undeclared variable', () => {
      const result = pipeline.compile('function f(): number { return unknown; }');
      assert.strictEqual(result.success, false);
      assert.ok(result.errors.length > 0);
    });

    it('returns error for invalid syntax', () => {
      const result = pipeline.compile('not valid typescript');
      assert.strictEqual(result.success, false);
    });

    it('returns error for unsupported type', () => {
      const result = pipeline.compile('function f(x: string) {}');
      assert.strictEqual(result.success, false);
    });
  });

  describe('pipeline stages', () => {
    it('lex() returns tokens', () => {
      const tokens = pipeline.lex('const x = 5;');
      assert.ok(tokens.length > 0);
    });

    it('parse() returns AST', () => {
      const ast = pipeline.parse('function f() {}');
      assert.strictEqual(ast.kind, 'Program');
      assert.strictEqual(ast.body.length, 1);
    });
  });

  describe('golden reference: complete module', () => {
    it('produces valid Verilog structure', () => {
      const source = `
        function alu_add(operand_a: number, operand_b: number, carry_in: boolean): number {
          const sum: number = operand_a + operand_b;
          return sum;
        }
      `;
      const result = pipeline.compile(source);
      assert.strictEqual(result.success, true);

      const lines = result.verilog.split('\n');
      // Check structural ordering
      assert.ok(lines.some(l => l.includes('`timescale')));
      assert.ok(lines.some(l => l.includes('`default_nettype none')));
      assert.ok(lines.some(l => l.includes('module alu_add')));
      assert.ok(lines.some(l => l.includes('endmodule')));
      assert.ok(lines.some(l => l.includes('`default_nettype wire')));
    });
  });
});
