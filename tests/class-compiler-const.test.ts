// Tests for top-level const substitution, import stripping, and multi-class compilation.
import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { compileClassModule } from '../packages/core/src/compiler/class-compiler/class-module-compiler';

describe('ClassModuleCompiler: top-level const support', () => {
    describe('single const inline substitution', () => {
        it('substitutes a numeric const in a comparison', () => {
            const result = compileClassModule(`
        const LIMIT = 100;
        class Counter extends Module {
          @Input clk: Logic<1>;
          @Output done: Logic<1> = 0;
          private cnt: Logic<8> = 0;
          @Sequential('clk')
          tick() {
            if (this.cnt === LIMIT) {
              this.done = 1;
            } else {
              this.cnt = this.cnt + 1;
            }
          }
        }
      `);
            assert.ok(result.success, result.errors.join(', '));
            assert.ok(result.systemverilog.includes('cnt == 100'), result.systemverilog);
        });

        it('substitutes a hex const and emits a properly-sized SV literal', () => {
            const result = compileClassModule(`
        const MASK = 0xFF;
        class Filter extends Module {
          @Input clk: Logic<1>;
          @Input  data: Logic<8>;
          @Output out:  Logic<8> = 0;
          @Sequential('clk')
          tick() { this.out = this.data & MASK; }
        }
      `);
            assert.ok(result.success, result.errors.join(', '));
            // 0xFF -> 8'hFF after hex sizing
            assert.ok(result.systemverilog.includes("8'hFF"), result.systemverilog);
        });

        it('substitutes a const used in assignment', () => {
            const result = compileClassModule(`
        const ALL_OFF = 0x3F;
        class Leds extends Module {
          @Input  clk: Logic<1>;
          @Output led: Logic<6> = 0;
          @Sequential('clk')
          tick() { this.led = ALL_OFF; }
        }
      `);
            assert.ok(result.success, result.errors.join(', '));
            assert.ok(result.systemverilog.includes("6'h3F"), result.systemverilog);
        });
    });

    describe('multiple consts in one source', () => {
        it('substitutes all consts defined in the same source unit', () => {
            const result = compileClassModule(`
        const LOW  = 0x00;
        const HIGH = 0xFF;
        class Blink extends Module {
          @Input  clk: Logic<1>;
          @Output out: Logic<8> = 0;
          private toggle: Logic<1> = 0;
          @Sequential('clk')
          tick() {
            if (this.toggle === 0) {
              this.out = LOW;
            } else {
              this.out = HIGH;
            }
            this.toggle = this.toggle + 1;
          }
        }
      `);
            assert.ok(result.success, result.errors.join(', '));
            assert.ok(result.systemverilog.includes("8'h00"), result.systemverilog);
            assert.ok(result.systemverilog.includes("8'hFF"), result.systemverilog);
        });

        it('substitutes consts with expression arithmetic', () => {
            const result = compileClassModule(`
        const N = 6;
        class Wrap extends Module {
          @Input  clk: Logic<1>;
          @Output phase: Logic<3> = 0;
          @Sequential('clk')
          tick() {
            if (this.phase === N - 1) {
              this.phase = 0;
            } else {
              this.phase = this.phase + 1;
            }
          }
        }
      `);
            assert.ok(result.success, result.errors.join(', '));
            assert.ok(result.systemverilog.includes('phase == 6 - 1'), result.systemverilog);
        });
    });

    describe('const does not spill into module port names', () => {
        it('module port names are not replaced by const substitution', () => {
            const result = compileClassModule(`
        const clk = 27000000;
        class Pass extends Module {
          @Input  clk: Logic<1>;
          @Output out: Logic<1> = 0;
          @Combinational
          pass() { this.out = this.clk; }
        }
      `);
            // The const named 'clk' must NOT affect the port declaration.
            assert.ok(result.success, result.errors.join(', '));
            assert.ok(result.systemverilog.includes('input  logic  clk'), result.systemverilog);
        });
    });

    describe('import stripping', () => {
        it('ignores import statements and still compiles the class', () => {
            const result = compileClassModule(`
        import { HardwareModule, Module, Input, Output, Sequential } from '@ts2v/runtime';
        import type { Bit, Logic } from '@ts2v/runtime';
        class Simple extends Module {
          @Input  clk: Logic<1>;
          @Output q: Logic<1> = 0;
          @Sequential('clk')
          tick() { this.q = 1; }
        }
      `);
            assert.ok(result.success, result.errors.join(', '));
            assert.ok(result.systemverilog.includes('module Simple'), result.systemverilog);
        });

        it('ignores re-export and named export lines', () => {
            const result = compileClassModule(`
        export { Foo } from './foo';
        class Bar extends Module {
          @Input  clk: Logic<1>;
          @Output y: Logic<1> = 0;
          @Combinational
          logic() { this.y = 1; }
        }
        export { Bar };
      `);
            assert.ok(result.success, result.errors.join(', '));
            assert.ok(result.systemverilog.includes('module Bar'), result.systemverilog);
        });
    });

    describe('multi-class compilation in one source unit', () => {
        it('emits multiple modules from one concatenated source', () => {
            const result = compileClassModule(`
        class Sub extends Module {
          @Input  clk: Logic<1>;
          @Input  a: Logic<4>;
          @Output b: Logic<4> = 0;
          @Sequential('clk')
          tick() { this.b = this.a; }
        }
        class Top extends Module {
          @Input  clk: Logic<1>;
          @Input  x: Logic<4>;
          @Output y: Logic<4> = 0;
          @Sequential('clk')
          tick() { this.y = this.x; }
        }
      `);
            assert.ok(result.success, result.errors.join(', '));
            assert.ok(result.systemverilog.includes('module Sub'), result.systemverilog);
            assert.ok(result.systemverilog.includes('module Top'), result.systemverilog);
        });
    });

    describe('const with type annotation', () => {
        it('handles typed const declarations', () => {
            const result = compileClassModule(`
        const DEPTH: number = 16;
        class Fifo extends Module {
          @Input  clk: Logic<1>;
          @Output full: Logic<1> = 0;
          private count: Logic<5> = 0;
          @Sequential('clk')
          tick() {
            if (this.count === DEPTH) {
              this.full = 1;
            } else {
              this.full = 0;
            }
          }
        }
      `);
            assert.ok(result.success, result.errors.join(', '));
            assert.ok(result.systemverilog.includes('count == 16'), result.systemverilog);
        });
    });
});
