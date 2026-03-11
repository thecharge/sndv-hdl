// Unit tests for the VerilogEmitter (code generation) stage.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CompilerPipeline } from '../src/pipeline/compiler-pipeline';

// Helper: compile source and return Verilog output.
function compileToVerilog(source: string): string {
  const result = new CompilerPipeline().compile(source);
  if (!result.success) throw new Error(result.errors.map(e => e.message).join('\n'));
  return result.verilog;
}

// Helper: assert Verilog output contains a fragment.
function assertVerilogContains(source: string, fragment: string): void {
  const verilog = compileToVerilog(source);
  assert.ok(verilog.includes(fragment), `Expected "${fragment}" in output:\n${verilog}`);
}

describe('VerilogEmitter', () => {
  describe('module structure', () => {
    it('generates module declaration', () => {
      assertVerilogContains('function adder(a: number, b: number): number { return a + b; }', 'module adder');
    });

    it('generates endmodule', () => {
      assertVerilogContains('function adder(a: number, b: number): number { return a + b; }', 'endmodule');
    });

    it('emits timescale header', () => {
      assertVerilogContains('function f() { return 0; }', '`timescale 1ns / 1ps');
    });

    it('emits default_nettype none at top', () => {
      assertVerilogContains('function f() { return 0; }', '`default_nettype none');
    });

    it('emits default_nettype wire at bottom', () => {
      assertVerilogContains('function f() { return 0; }', '`default_nettype wire');
    });
  });

  describe('port generation', () => {
    it('generates input ports for parameters', () => {
      assertVerilogContains(
        'function f(x: number): number { return x; }',
        'input  wire [31:0] x',
      );
    });

    it('generates output port for result', () => {
      assertVerilogContains(
        'function f(x: number): number { return x; }',
        'output wire [31:0] result',
      );
    });

    it('generates 1-bit boolean ports without width spec', () => {
      assertVerilogContains(
        'function f(flag: boolean): boolean { return flag; }',
        'input  wire  flag',
      );
    });
  });

  describe('expression emission', () => {
    const EXPRESSION_CASES: [string, string][] = [
      ['return 42;', "32'd42"],
      ['return 0xFF;', "32'h"],
      ['return true;', "1'b1"],
      ['return false;', "1'b0"],
      ['return a + b;', '(a + b)'],
      ['return a - b;', '(a - b)'],
      ['return a * b;', '(a * b)'],
      ['return a & b;', '(a & b)'],
      ['return a | b;', '(a | b)'],
      ['return a ^ b;', '(a ^ b)'],
      ['return a >> b;', '(a >> b)'],
      ['return a << b;', '(a << b)'],
      ['return a === b;', '(a == b)'],
      ['return a !== b;', '(a != b)'],
      ['return ~a;', '(~a)'],
    ];

    for (const [ts_statement, expected_fragment] of EXPRESSION_CASES) {
      it(`emits "${expected_fragment}" for "${ts_statement}"`, () => {
        const source = `function f(a: number, b: number): number { ${ts_statement} }`;
        assertVerilogContains(source, expected_fragment);
      });
    }
  });

  describe('assign statements', () => {
    it('generates assign for return', () => {
      assertVerilogContains(
        'function f(a: number, b: number): number { return a + b; }',
        'assign result =',
      );
    });

    it('generates assign for local variables', () => {
      const verilog = compileToVerilog(
        'function f(a: number): number { const doubled: number = a + a; return doubled; }',
      );
      assert.ok(verilog.includes('assign doubled ='));
      assert.ok(verilog.includes('assign result ='));
    });
  });

  describe('if/else to ternary', () => {
    it('generates ternary for simple if/else with return', () => {
      const source = `
        function mux(sel: boolean, a: number, b: number): number {
          if (sel) { return a; } else { return b; }
        }
      `;
      const verilog = compileToVerilog(source);
      assert.ok(verilog.includes('?'), 'Expected ternary operator in output');
    });
  });

  describe('identifier sanitization', () => {
    it('escapes Verilog reserved words', () => {
      const verilog = compileToVerilog('function f(wire_v: number): number { return wire_v; }');
      assert.ok(verilog.includes('wire_v'));
    });
  });

  describe('multiple modules', () => {
    it('generates separate modules for each function', () => {
      const verilog = compileToVerilog(
        'function a(x: number): number { return x; } function b(y: number): number { return y; }',
      );
      assert.ok(verilog.includes('module a'));
      assert.ok(verilog.includes('module b'));
    });
  });
});
