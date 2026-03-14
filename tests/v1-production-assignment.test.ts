import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { compileClassModule } from '../packages/core/src/compiler/class-compiler/class-module-compiler';

function compile(source: string): string {
  const result = compileClassModule(source);
  if (!result.success) {
    throw new Error(`Compilation failed: ${result.errors.join(', ')}`);
  }
  return result.systemverilog;
}
describe('v1.0.0 production: token-level assignment parsing', () => {
  it('this.x++ compiles to x <= x + 1', () => {
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
    assert.ok(sv.includes('count <= count + 1'), 'increment');
  });

  it('this.x-- compiles to x <= x - 1', () => {
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
    assert.ok(sv.includes('count <= count - 1'), 'decrement');
  });

  it('this.x += expr compiles to x <= x + expr', () => {
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
    assert.ok(sv.includes('sum <= sum + val'), 'compound add');
  });

  it('this.mem[addr] = data compiles to array assignment', () => {
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
    assert.ok(sv.includes('mem[addr] <= data'), 'array assignment');
  });
});

describe('v1.0.0 production: module hierarchy', () => {
  it('submodule generates SystemVerilog instantiation', () => {
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
    assert.ok(sv.includes('module Child ('), 'Child module');
    assert.ok(sv.includes('module Parent ('), 'Parent module');
    assert.ok(sv.includes('Child child_inst ('), 'instantiation');
    assert.ok(sv.includes('.clk(clk)'), 'clk port');
    assert.ok(sv.includes('.rst_n(rst_n)'), 'rst_n port');
  });
});

describe("v1.0.0 production: SVA assertions", () => {
  it('inline Assert() compiles to immediate assertion', () => {
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
    assert.ok(sv.includes('assert') && sv.includes('val') && sv.includes('200'),
      'should contain assertion with val and 200');
  });

  it('Assert with message includes $error', () => {
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
    assert.ok(sv.includes('$error("overflow!")'), 'error message');
  });
});
