import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { compileClassModule, ClassModuleParser } from '../packages/core/src/compiler/class-compiler/class-module-compiler';

describe('v1.0.0: Regex-Free Assignment Parsing', () => {

  it('handles complex expression in assignment (nested parens)', () => {
    const result = compileClassModule(`
      class Mux extends Module {
        @Input sel: Logic<1>;
        @Input a: Logic<8>;
        @Input b: Logic<8>;
        @Output out: Logic<8> = 0;
        @Combinational
        logic() {
          if (this.sel === 1) {
            this.out = this.a;
          } else {
            this.out = this.b;
          }
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('out ='));
    assert.ok(result.systemverilog.includes('if (sel == 1)'));
  });

  it('handles nested parentheses in assignment RHS', () => {
    const result = compileClassModule(`
      class X extends Module {
        @Input a: Logic<8>;
        @Input b: Logic<8>;
        @Output out: Logic<8> = 0;
        @Combinational
        logic() {
          this.out = ((this.a + this.b) & 0xFF);
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('out ='));
    assert.ok(result.systemverilog.includes('(a + b)'));
  });

  it('handles this.x++ via token detection (not regex)', () => {
    const result = compileClassModule(`
      class Counter extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Output count: Logic<8> = 0;
        @Sequential(clk)
        update() {
          this.count++;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('count <= count + 1'));
  });

  it('handles this.x-- via token detection', () => {
    const result = compileClassModule(`
      class Countdown extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Output count: Logic<8> = 255;
        @Sequential(clk)
        update() {
          this.count--;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('count <= count - 1'));
  });

  it('handles this.x += expr via token detection', () => {
    const result = compileClassModule(`
      class Accum extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Input val: Logic<8>;
        @Output sum: Logic<16> = 0;
        @Sequential(clk)
        update() {
          this.sum += this.val;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('sum <= sum + val'));
  });

  it('handles array index in assignment target', () => {
    const result = compileClassModule(`
      class Mem extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Input addr: Logic<4>;
        @Input data: Logic<8>;
        private mem: Logic<8>[16];
        @Sequential(clk)
        write() {
          this.mem[this.addr] = this.data;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('mem[addr] <= data'));
  });
});

describe('v1.0.0: Context-Aware Bit-Width Emission', () => {

  it('sizes reset value to match 1-bit output', () => {
    const result = compileClassModule(`
      class X extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Output flag: Logic<1> = 0;
        @Sequential(clk)
        update() {
          this.flag = 1;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    // Reset value should be sized to 1 bit
    assert.ok(result.systemverilog.includes("flag <= 1'b0"),
      'Reset value 0 for 1-bit should be 1\'b0, got:\n' + result.systemverilog);
    // Assignment value should be sized to 1 bit  
    assert.ok(result.systemverilog.includes("flag <= 1'b1"),
      'Assignment 1 to 1-bit should be 1\'b1, got:\n' + result.systemverilog);
  });

  it('sizes reset value to match 8-bit output', () => {
    const result = compileClassModule(`
      class X extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Output data: Logic<8> = 0;
        @Sequential(clk)
        update() {
          this.data = 255;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes("data <= 8'd0"),
      'Reset value 0 for 8-bit should be 8\'d0');
    assert.ok(result.systemverilog.includes("data <= 8'd255"),
      'Assignment 255 to 8-bit should be 8\'d255');
  });

  it('sizes reset value to match 4-bit output', () => {
    const result = compileClassModule(`
      class X extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Output count: Logic<4> = 0;
        @Sequential(clk)
        update() {
          this.count = 5;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes("count <= 4'd0"),
      'Reset for 4-bit should be 4\'d0');
    assert.ok(result.systemverilog.includes("count <= 4'd5"),
      'Assignment 5 to 4-bit should be 4\'d5');
  });

  it('leaves expressions with operators unsized (not bare literals)', () => {
    const result = compileClassModule(`
      class X extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Output count: Logic<8> = 0;
        @Sequential(clk)
        update() {
          this.count = this.count + 1;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    // count + 1 is a complex expr, not a bare literal — should NOT be width-prefixed
    assert.ok(result.systemverilog.includes('count <= count + 1'),
      'Expression should stay as-is');
  });

  it('preserves hex literals with natural width', () => {
    const result = compileClassModule(`
      class X extends Module {
        @Input a: Logic<8>;
        @Output out: Logic<8> = 0;
        @Combinational
        logic() {
          this.out = this.a & 0xFF;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes("8'hFF"),
      'Hex 0xFF should become 8\'hFF');
  });
});

