// Build pipeline tests: prove every example compiles to structurally valid Verilog.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { CompilerPipeline } from '../packages/core/src/compiler/pipeline/compiler-pipeline';
import { lintVerilog } from '../packages/core/src/compiler/lint/verilog-linter';

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const pipeline = new CompilerPipeline();

// Load all .ts example files from the examples directory.
function loadExamples(): { name: string; source: string }[] {
  const files = fs.readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.ts'));
  return files.map(f => ({ name: f, source: fs.readFileSync(path.join(EXAMPLES_DIR, f), 'utf-8') }));
}

// Count occurrences of a pattern in a string.
function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length;
}

// Count function declarations in TypeScript source.
function countFunctions(source: string): number {
  return countMatches(source, /^function\s+\w+/gm);
}

describe('Build pipeline: compilation soundness', () => {
  const examples = loadExamples();

  describe('all examples compile without errors', () => {
    for (const { name, source } of examples) {
      it(`compiles ${name} successfully`, () => {
        const result = pipeline.compile(source);
        assert.strictEqual(result.success, true, `${name} failed: ${result.errors.map(e => e.message).join(', ')}`);
        assert.ok(result.verilog.length > 0, `${name} produced empty output`);
      });
    }
  });

  describe('Verilog structural invariants', () => {
    for (const { name, source } of examples) {
      it(`${name}: has timescale directive`, () => {
        const result = pipeline.compile(source);
        assert.ok(result.verilog.includes('`timescale 1ns / 1ps'), `Missing timescale in ${name}`);
      });

      it(`${name}: has default_nettype guards`, () => {
        const result = pipeline.compile(source);
        assert.ok(result.verilog.includes('`default_nettype none'), `Missing default_nettype none in ${name}`);
        assert.ok(result.verilog.includes('`default_nettype wire'), `Missing default_nettype wire in ${name}`);
      });

      it(`${name}: module/endmodule counts match`, () => {
        const result = pipeline.compile(source);
        const module_count = countMatches(result.verilog, /^module\s/gm);
        const endmodule_count = countMatches(result.verilog, /^endmodule$/gm);
        assert.strictEqual(module_count, endmodule_count, `Mismatched module/endmodule in ${name}`);
      });

      it(`${name}: module count matches function count`, () => {
        const result = pipeline.compile(source);
        const function_count = countFunctions(source);
        const module_count = countMatches(result.verilog, /^module\s/gm);
        assert.strictEqual(module_count, function_count, `Expected ${function_count} modules, got ${module_count} in ${name}`);
      });
    }
  });

  describe('port correctness', () => {
    for (const { name, source } of examples) {
      it(`${name}: every module has input/output ports`, () => {
        const result = pipeline.compile(source);
        const modules = result.verilog.split(/(?=^module\s)/gm).filter(m => m.startsWith('module'));
        for (const mod of modules) {
          assert.ok(mod.includes('output'), `Module in ${name} missing output port`);
        }
      });

      it(`${name}: every module has result output`, () => {
        const result = pipeline.compile(source);
        assert.ok(result.verilog.includes('output'), `${name} missing output ports`);
      });
    }
  });

  describe('no forbidden patterns in output', () => {
    for (const { name, source } of examples) {
      it(`${name}: no undefined or NaN literals`, () => {
        const result = pipeline.compile(source);
        assert.ok(!result.verilog.includes('undefined'), `${name} contains 'undefined'`);
        assert.ok(!result.verilog.includes('NaN'), `${name} contains 'NaN'`);
      });

      it(`${name}: no TypeScript artifacts`, () => {
        const result = pipeline.compile(source);
        assert.ok(!result.verilog.includes('function '), `${name} contains TS 'function' keyword`);
        assert.ok(!result.verilog.includes('const '), `${name} contains TS 'const' keyword`);
        assert.ok(!result.verilog.includes('return '), `${name} contains TS 'return' keyword`);
      });

      it(`${name}: uses correct Verilog operators`, () => {
        const result = pipeline.compile(source);
        assert.ok(!result.verilog.includes('==='), `${name} contains TS '===' operator`);
        assert.ok(!result.verilog.includes('!=='), `${name} contains TS '!==' operator`);
      });
    }
  });

  describe('Verilog lint: zero errors on all outputs', () => {
    for (const { name, source } of examples) {
      it(`${name}: passes structural lint with no errors`, () => {
        const result = pipeline.compile(source);
        const diagnostics = lintVerilog(result.verilog);
        const errors = diagnostics.filter(d => d.severity === 'error');
        assert.strictEqual(errors.length, 0, `${name} lint errors: ${errors.map(e => e.message).join(', ')}`);
      });

      it(`${name}: no multiply-driven nets`, () => {
        const result = pipeline.compile(source);
        const diagnostics = lintVerilog(result.verilog);
        const multi = diagnostics.filter(d => d.rule === 'no-multi-driven');
        assert.strictEqual(multi.length, 0, `${name}: ${multi.map(e => e.message).join(', ')}`);
      });
    }
  });

  describe('specific example module counts', () => {
    const EXPECTED_MODULE_COUNTS: [string, number][] = [
      ['stdlib.ts', 12],
      ['blinker.ts', 6],
      ['uart_tx.ts', 8],
      ['pwm.ts', 7],
      ['ws2812.ts', 9],
      ['i2c.ts', 12],
      ['adder.ts', 1],
      ['mux.ts', 1],
      ['alu.ts', 5],
      ['comparator.ts', 5],
    ];

    for (const [file_name, expected_count] of EXPECTED_MODULE_COUNTS) {
      const example = examples.find(e => e.name === file_name);
      if (!example) continue;
      it(`${file_name} produces ${expected_count} Verilog modules`, () => {
        const result = pipeline.compile(example.source);
        const module_count = countMatches(result.verilog, /^module\s/gm);
        assert.strictEqual(module_count, expected_count);
      });
    }
  });
});

describe('Build pipeline: golden reference validation', () => {
  it('adder produces correct wire equation', () => {
    const source = 'function adder(operand_a: number, operand_b: number): number { return operand_a + operand_b; }';
    const result = pipeline.compile(source);
    assert.ok(result.success);
    assert.ok(result.verilog.includes('assign result = (operand_a + operand_b)'));
  });

  it('mux produces ternary operator', () => {
    const source = 'function mux(sel: boolean, a: number, b: number): number { if (sel) { return a; } else { return b; } }';
    const result = pipeline.compile(source);
    assert.ok(result.success);
    assert.ok(result.verilog.includes('?'));
    assert.ok(result.verilog.includes(':'));
  });

  it('bitwise ops map 1:1 to Verilog', () => {
    const source = 'function bitops(a: number, b: number): number { return (a & b) | (a ^ b); }';
    const result = pipeline.compile(source);
    assert.ok(result.success);
    assert.ok(result.verilog.includes('(a & b)'));
    assert.ok(result.verilog.includes('(a ^ b)'));
  });

  it('comparison uses Verilog == not ===', () => {
    const source = 'function eq(a: number, b: number): boolean { return a === b; }';
    const result = pipeline.compile(source);
    assert.ok(result.success);
    assert.ok(result.verilog.includes('(a == b)'));
    assert.ok(!result.verilog.includes('==='));
  });

  it('hex literals produce Verilog hex format', () => {
    const source = 'function mask(x: number): number { return x & 0xFF; }';
    const result = pipeline.compile(source);
    assert.ok(result.success);
    assert.ok(result.verilog.includes("32'hFF"));
  });

  it('boolean ports produce 1-bit width', () => {
    const source = 'function flag(a: number, b: number): boolean { return a > b; }';
    const result = pipeline.compile(source);
    assert.ok(result.success);
    assert.ok(result.verilog.includes('output logic  result'), 'IEEE 1800-2017: output must be logic not wire');
  });
});
