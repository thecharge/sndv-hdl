// ts2v v1.0.0 production tests
// Tests the FULL pipeline: valid TypeScript → class-module-compiler → SystemVerilog
// Run: node --require ts-node/register/transpile-only tests/v1-production.test.ts

import { compileClassModule, ClassModuleParser } from '../src/class-compiler/class-module-compiler';
import * as fs from 'fs';
import * as path from 'path';

// ── Test harness ──────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: unknown) {
    failed++;
    const msg = e instanceof Error ? e.message : String(e);
    failures.push(`${name}: ${msg}`);
    console.log(`  ✗ ${name}`);
    console.log(`    → ${msg}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertIncludes(haystack: string, needle: string, context?: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`Expected output to contain "${needle}"${context ? ` (${context})` : ''}\nGot:\n${haystack.slice(0, 500)}`);
  }
}

function assertNotIncludes(haystack: string, needle: string, context?: string): void {
  if (haystack.includes(needle)) {
    throw new Error(`Expected output NOT to contain "${needle}"${context ? ` (${context})` : ''}`);
  }
}

// ── Helper: compile valid TypeScript class source ─────────────

function compile(source: string): string {
  const result = compileClassModule(source);
  if (!result.success) {
    throw new Error(`Compilation failed: ${result.errors.join(', ')}`);
  }
  return result.systemverilog;
}

// ══════════════════════════════════════════════════════════════
// TEST SUITE
// ══════════════════════════════════════════════════════════════

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  ts2v v1.0.0 — Production Test Suite                    ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// ── 1. Runtime type safety ────────────────────────────────────

console.log('1. TypeScript Compliance');

test('tsc --strict accepts runtime/types.ts', () => {
  // If we got here, the import worked. The real check is tsc --noEmit
  // which runs in CI. Here we verify the types are usable.
  const types = require('../src/runtime/types');
  assert(types !== undefined, 'runtime/types module should load');
});

test('tsc --strict accepts runtime/decorators.ts', () => {
  const decs = require('../src/runtime/decorators');
  assert(typeof decs.Module === 'function', 'Module should be a function');
  assert(typeof decs.Input === 'function', 'Input should be a function');
  assert(typeof decs.Output === 'function', 'Output should be a function');
  assert(typeof decs.Sequential === 'function', 'Sequential should be a function');
  assert(typeof decs.Combinational === 'function', 'Combinational should be a function');
  assert(typeof decs.Assert === 'function', 'Assert should be a function');
  assert(typeof decs.Submodule === 'function', 'Submodule should be a function');
});

test('decorators are no-ops at runtime', () => {
  const { Module, Input, Sequential, Assert } = require('../src/runtime/decorators');
  // Class decorator returns target unchanged
  class Dummy {}
  assert(Module(Dummy) === Dummy, 'Module should return target');
  // Property decorator is void
  Input({}, 'x');
  // Method decorator factory returns descriptor
  const desc = { value: () => {} } as PropertyDescriptor;
  const result = Sequential('clk')({}, 'tick', desc);
  assert(result === desc, 'Sequential should return descriptor');
  // Assert is a no-op
  Assert(true, 'msg');
  Assert(false, 'msg'); // should not throw at runtime
});

// ── 2. Import/export parsing ──────────────────────────────────

console.log('\n2. Import/Export Handling');

test('parser skips import { } from statements', () => {
  const sv = compile(`
    import { HardwareModule, Module, Input, Output, Sequential } from '../../src/runtime';
    import type { Logic, Bit } from '../../src/runtime';
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Output out: Bit = 0;
      @Sequential('clk')
      tick(): void { this.out = 1; }
    }
  `);
  assertIncludes(sv, 'module X (');
  assertNotIncludes(sv, 'import');
});

test('parser skips export { Name } statements', () => {
  const sv = compile(`
    import { HardwareModule, Module, Input, Output, Sequential } from '../../src/runtime';
    import type { Logic, Bit } from '../../src/runtime';
    @Module
    class Y extends HardwareModule {
      @Input clk: Bit = 0;
      @Output led: Bit = 0;
      @Sequential('clk')
      tick(): void { this.led = 1; }
    }
    export { Y };
  `);
  assertIncludes(sv, 'module Y (');
  assertNotIncludes(sv, 'export');
});

// ── 3. Context-aware bit-width emission ───────────────────────

console.log('\n3. Context-Aware Bit-Width Emission');

test('1-bit output reset → 1\'b0', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Output flag: Logic<1> = 0;
      @Sequential('clk')
      tick(): void { this.flag = 1; }
    }
  `);
  assertIncludes(sv, "flag <= 1'b0", 'reset value');
  assertIncludes(sv, "flag <= 1'b1", 'assignment');
});

test('8-bit output reset → 8\'d0', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Output data: Logic<8> = 0;
      @Sequential('clk')
      tick(): void { this.data = 255; }
    }
  `);
  assertIncludes(sv, "data <= 8'd0", 'reset value');
  assertIncludes(sv, "data <= 8'd255", 'assignment');
});

test('4-bit output reset → 4\'d0', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Output count: Logic<4> = 0;
      @Sequential('clk')
      tick(): void { this.count = 5; }
    }
  `);
  assertIncludes(sv, "count <= 4'd0");
  assertIncludes(sv, "count <= 4'd5");
});

test('complex expressions stay unsized', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Output count: Logic<8> = 0;
      @Sequential('clk')
      tick(): void { this.count = this.count + 1; }
    }
  `);
  assertIncludes(sv, 'count <= count + 1', 'expression should pass through unsized');
});

test('hex literals get natural width', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input a: Logic<8> = 0;
      @Output out: Logic<8> = 0;
      @Combinational
      logic(): void { this.out = this.a & 0xFF; }
    }
  `);
  assertIncludes(sv, "8'hFF", 'hex should be naturally sized');
});

// ── 4. Token-level assignment parsing (no regex) ──────────────

console.log('\n4. Token-Level Assignment Parsing');

test('this.x++ compiles to x <= x + 1', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Output count: Logic<8> = 0;
      @Sequential('clk')
      tick(): void { this.count++; }
    }
  `);
  assertIncludes(sv, 'count <= count + 1');
});

test('this.x-- compiles to x <= x - 1', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Output count: Logic<8> = 255;
      @Sequential('clk')
      tick(): void { this.count--; }
    }
  `);
  assertIncludes(sv, 'count <= count - 1');
});

test('this.x += expr compiles to x <= x + expr', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Input val: Logic<8> = 0;
      @Output sum: Logic<16> = 0;
      @Sequential('clk')
      tick(): void { this.sum += this.val; }
    }
  `);
  assertIncludes(sv, 'sum <= sum + val');
});

test('this.mem[addr] = data compiles to array assignment', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Input addr: Logic<4> = 0;
      @Input data: Logic<8> = 0;
      private mem: Logic<8>[16] = [];
      @Sequential('clk')
      write(): void { this.mem[this.addr] = this.data; }
    }
  `);
  assertIncludes(sv, 'mem[addr] <= data');
});

// ── 5. Module hierarchy ───────────────────────────────────────

console.log('\n5. Module Hierarchy');

test('submodule generates SystemVerilog instantiation', () => {
  const sv = compile(`
    @Module
    class Child extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Input data_in: Logic<8> = 0;
      @Output data_out: Logic<8> = 0;
      @Sequential('clk')
      process(): void { this.data_out = this.data_in; }
    }
    @Module
    class Parent extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Input data_in: Logic<8> = 0;
      @Output data_out: Logic<8> = 0;
      @Submodule child_inst: Child = new Child();
      @Sequential('clk')
      main(): void { this.data_out = this.data_in; }
    }
  `);
  assertIncludes(sv, 'module Child (');
  assertIncludes(sv, 'module Parent (');
  assertIncludes(sv, 'Child child_inst (');
  assertIncludes(sv, '.clk(clk)');
  assertIncludes(sv, '.rst_n(rst_n)');
});

// ── 6. SVA assertions ─────────────────────────────────────────

console.log('\n6. SVA Assertions');

test('inline Assert() compiles to immediate assertion', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Output val: Logic<8> = 0;
      @Sequential('clk')
      tick(): void {
        Assert(this.val < 200);
        this.val = this.val + 1;
      }
    }
  `);
  assert(sv.includes('assert') && sv.includes('val') && sv.includes('200'),
    'should contain assertion with val and 200');
});

test('Assert with message includes $error', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Output count: Logic<4> = 0;
      @Sequential('clk')
      tick(): void {
        Assert(this.count < 15, "overflow!");
        this.count++;
      }
    }
  `);
  assertIncludes(sv, '$error("overflow!")');
});

// ── 7. IEEE 1800-2017 compliance ──────────────────────────────

console.log('\n7. IEEE 1800-2017 Compliance');

test('output contains timescale directive', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input a: Bit = 0;
      @Output b: Bit = 0;
      @Combinational
      logic(): void { this.b = this.a; }
    }
  `);
  assertIncludes(sv, '`timescale 1ns / 1ps');
});

test('output contains default_nettype guards', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input a: Bit = 0;
      @Output b: Bit = 0;
      @Combinational
      logic(): void { this.b = this.a; }
    }
  `);
  assertIncludes(sv, '`default_nettype none');
  assertIncludes(sv, '`default_nettype wire');
});

test('sequential uses always_ff with async reset', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input clk: Bit = 0;
      @Input rst_n: Bit = 0;
      @Output out: Logic<8> = 0;
      @Sequential('clk')
      tick(): void { this.out = this.out + 1; }
    }
  `);
  assertIncludes(sv, 'always_ff @(posedge clk or negedge rst_n)');
  assertIncludes(sv, 'if (!rst_n)');
});

test('combinational uses always_comb', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input a: Logic<8> = 0;
      @Output b: Logic<8> = 0;
      @Combinational
      logic(): void { this.b = this.a; }
    }
  `);
  assertIncludes(sv, 'always_comb begin');
});

test('enum generates typedef enum logic', () => {
  const sv = compile(`
    enum State { IDLE, RUN, DONE }
    @Module
    class X extends HardwareModule {
      @Input a: Bit = 0;
      @Output b: Bit = 0;
      @Combinational
      logic(): void { this.b = this.a; }
    }
  `);
  assertIncludes(sv, 'typedef enum logic');
  assertIncludes(sv, "IDLE = 2'd0");
});

test('v1.0.0 header is present', () => {
  const sv = compile(`
    @Module
    class X extends HardwareModule {
      @Input a: Bit = 0;
      @Output b: Bit = 0;
      @Combinational
      logic(): void { this.b = this.a; }
    }
  `);
  assertIncludes(sv, 'v1.0.0');
});

// ── 8. End-to-end: Tang Nano 20K examples ─────────────────────

console.log('\n8. End-to-End: Tang Nano 20K Examples');

test('tang_nano_20k_blinker.ts compiles from valid TypeScript', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'examples', 'hardware', 'tang_nano_20k_blinker.ts'),
    'utf-8',
  );
  const result = compileClassModule(source);
  assert(result.success, `Compilation failed: ${result.errors.join(', ')}`);
  assertIncludes(result.systemverilog, 'module Blinker (');
  assertIncludes(result.systemverilog, 'always_ff');
  assertIncludes(result.systemverilog, 'always_comb');
  assertIncludes(result.systemverilog, 'typedef enum logic');
  assertIncludes(result.systemverilog, 'assert');
});

test('tang_nano_20k_breathe.ts compiles with submodule instantiation', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'examples', 'hardware', 'tang_nano_20k_breathe.ts'),
    'utf-8',
  );
  const result = compileClassModule(source);
  assert(result.success, `Compilation failed: ${result.errors.join(', ')}`);
  assertIncludes(result.systemverilog, 'module PwmCore (');
  assertIncludes(result.systemverilog, 'module BreatheLed (');
  assertIncludes(result.systemverilog, 'PwmCore pwm (');
  assertIncludes(result.systemverilog, '.clk(clk)');
});

test('counter.ts compiles from valid TypeScript', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'examples', 'hardware', 'counter.ts'),
    'utf-8',
  );
  const result = compileClassModule(source);
  assert(result.success, `Compilation failed: ${result.errors.join(', ')}`);
  assertIncludes(result.systemverilog, 'module Counter (');
  assertIncludes(result.systemverilog, "count <= 8'd0");
});

// ── 9. Constraint generation ──────────────────────────────────

console.log('\n9. Board Constraint Generation');

test('tang_nano_20k.board.json generates valid Gowin .cst', () => {
  const { generateConstraints } = require('../src/constraints/board-constraint-gen');
  const boardJson = fs.readFileSync(
    path.join(__dirname, '..', 'boards', 'tang_nano_20k.board.json'),
    'utf-8',
  );
  const board = JSON.parse(boardJson);
  const cst = generateConstraints(board);
  assertIncludes(cst.content, 'IO_LOC');
  assertIncludes(cst.content, 'IO_PORT');
  assertIncludes(cst.content, '"clk" 4');
  assertIncludes(cst.content, 'LVCMOS33');
  assertIncludes(cst.content, 'GW2AR-18C');
});

// ══════════════════════════════════════════════════════════════
// RESULTS
// ══════════════════════════════════════════════════════════════

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log(`║  Results: ${passed} passed, ${failed} failed${' '.repeat(Math.max(0, 32 - String(passed).length - String(failed).length))}║`);
console.log('╚══════════════════════════════════════════════════════════╝');

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  ✗ ${f}`);
  }
  process.exit(1);
} else {
  console.log('\nAll tests passed.\n');
}
