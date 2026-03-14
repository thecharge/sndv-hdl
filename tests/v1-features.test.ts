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

describe('v1.0.0: Module Hierarchy (Submodule Instantiation)', () => {

  it('parses submodule from new keyword in property initializer', () => {
    const source = `
      class UartTx extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Input data: Logic<8>;
        @Output tx: Logic<1> = 1;
        @Sequential(clk)
        send() {
          this.tx = 0;
        }
      }

      class SoC extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Input data: Logic<8>;
        @Output tx: Logic<1> = 1;
        @Submodule uart: Logic<1> = new UartTx();
        @Sequential(clk)
        main() {
          this.tx = 0;
        }
      }
    `;
    const parser = new ClassModuleParser(source);
    const parsed = parser.parse();
    const soc = parsed.modules.find(m => m.name === 'SoC');
    assert.ok(soc, 'SoC module should be parsed');
    assert.equal(soc.submodules.length, 1, 'Should have 1 submodule');
    assert.equal(soc.submodules[0].module_type, 'UartTx');
    assert.equal(soc.submodules[0].instance_name, 'uart');
  });

  it('emits SystemVerilog module instantiation', () => {
    const result = compileClassModule(`
      class Child extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Input data_in: Logic<8>;
        @Output data_out: Logic<8> = 0;
        @Sequential(clk)
        process() {
          this.data_out = this.data_in;
        }
      }

      class Parent extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Input data_in: Logic<8>;
        @Output data_out: Logic<8> = 0;
        @Submodule child_inst: Logic<1> = new Child();
        @Sequential(clk)
        main() {
          this.data_out = this.data_in;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('Child child_inst ('),
      'Should contain module instantiation');
    assert.ok(result.systemverilog.includes('.clk(clk)'),
      'Should auto-bind clock');
    assert.ok(result.systemverilog.includes('.rst_n(rst_n)'),
      'Should auto-bind reset');
  });

  it('generates both parent and child modules', () => {
    const result = compileClassModule(`
      class Inner extends Module {
        @Input a: Logic<4>;
        @Output b: Logic<4> = 0;
        @Combinational
        logic() {
          this.b = this.a;
        }
      }

      class Outer extends Module {
        @Input a: Logic<4>;
        @Output b: Logic<4> = 0;
        @Submodule inner: Logic<1> = new Inner();
        @Combinational
        logic() {
          this.b = this.a;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('module Inner ('));
    assert.ok(result.systemverilog.includes('module Outer ('));
    assert.ok(result.systemverilog.includes('Inner inner ('));
  });
});

describe('v1.0.0: SVA Assertions', () => {

  it('generates SVA from @Assert decorator', () => {
    const result = compileClassModule(`
      class Counter extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Output count: Logic<4> = 0;
        @Assert(this.count < 15)
        @Sequential(clk)
        update() {
          this.count++;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('assert property'),
      'Should contain SVA assert property');
    assert.ok(result.systemverilog.includes('count') && result.systemverilog.includes('15'),
      'Assertion condition should reference count and 15');
  });

  it('generates SVA from inline Assert() call', () => {
    const result = compileClassModule(`
      class X extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Output val: Logic<8> = 0;
        @Sequential(clk)
        update() {
          this.val = this.val + 1;
          Assert(this.val < 200);
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('assert') && result.systemverilog.includes('val') && result.systemverilog.includes('200'),
      'Should contain inline assert with val and 200');
  });

  it('generates SVA with error message', () => {
    const result = compileClassModule(`
      class X extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Output count: Logic<4> = 0;
        @Assert(this.count < 15, "count overflow!")
        @Sequential(clk)
        update() {
          this.count++;
        }
      }
    `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(result.systemverilog.includes('$error("count overflow!")'),
      'Should contain error message in SVA');
  });
});

describe('v1.0.0: Regression — existing features preserved', () => {

  it('still generates enums correctly', () => {
    const result = compileClassModule(`
      enum State { IDLE, RUN, DONE }
      class X extends Module {
        @Input clk: Logic<1>;
        @Output out: Logic<1> = 0;
        @Combinational
        logic() { this.out = 0; }
      }
    `);
    assert.ok(result.success);
    assert.ok(result.systemverilog.includes('typedef enum logic [1:0]'));
    assert.ok(result.systemverilog.includes("IDLE = 2'd0"));
  });

  it('still generates always_ff with async reset', () => {
    const result = compileClassModule(`
      class Counter extends Module {
        @Input clk: Logic<1>;
        @Input rst_n: Logic<1>;
        @Output count: Logic<8> = 0;
        @Sequential(clk)
        update() {
          this.count = this.count + 1;
        }
      }
    `);
    assert.ok(result.success);
    assert.ok(result.systemverilog.includes('always_ff @(posedge clk or negedge rst_n)'));
    assert.ok(result.systemverilog.includes('if (!rst_n)'));
  });

  it('still generates switch/case', () => {
    const result = compileClassModule(`
      enum Op { ADD, SUB, AND, OR }
      class ALU extends Module {
        @Input op: Logic<2>;
        @Input a: Logic<8>;
        @Input b: Logic<8>;
        @Output result: Logic<8> = 0;
        @Combinational
        logic() {
          switch (this.op) {
            case Op.ADD:
              this.result = this.a + this.b;
              break;
            case Op.SUB:
              this.result = this.a - this.b;
              break;
            default:
              this.result = 0;
              break;
          }
        }
      }
    `);
    assert.ok(result.success);
    assert.ok(result.systemverilog.includes('case (op)'));
    assert.ok(result.systemverilog.includes('ADD: begin'));
    assert.ok(result.systemverilog.includes('endcase'));
  });

  it('v1.0.0 header is present', () => {
    const result = compileClassModule(`
      class X extends Module {
        @Input a: Logic<1>;
        @Output b: Logic<1> = 0;
        @Combinational
        logic() { this.b = this.a; }
      }
    `);
    assert.ok(result.success);
    assert.ok(result.systemverilog.includes('v2.0.0'), 'Generated SV must contain version header');
  });
});
