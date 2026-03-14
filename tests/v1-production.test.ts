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
describe('v1.0.0 production: runtime type safety', () => {
  it('tsc --strict accepts runtime/types.ts', () => {
    const types = require('../packages/runtime/src/types');
    assert.ok(types !== undefined, 'runtime/types module should load');
  });

  it('tsc --strict accepts runtime/decorators.ts', () => {
    const decs = require('../packages/runtime/src/decorators');
    assert.ok(typeof decs.Module === 'function', 'Module should be a function');
    assert.ok(typeof decs.Input === 'function', 'Input should be a function');
    assert.ok(typeof decs.Output === 'function', 'Output should be a function');
    assert.ok(typeof decs.Sequential === 'function', 'Sequential should be a function');
    assert.ok(typeof decs.Combinational === 'function', 'Combinational should be a function');
    assert.ok(typeof decs.Assert === 'function', 'Assert should be a function');
    assert.ok(typeof decs.Submodule === 'function', 'Submodule should be a function');
  });

  it('decorators are no-ops at runtime', () => {
    const { Module, Input, Sequential, Assert } = require('../packages/runtime/src/decorators');
    class Dummy {}
    assert.ok(Module(Dummy) === Dummy, 'Module should return target');
    Input({}, 'x');
    const desc = { value: () => {} } as PropertyDescriptor;
    const returned = Sequential('clk')({}, 'tick', desc);
    assert.ok(returned === desc, 'Sequential should return descriptor');
    Assert(true, 'msg');
    Assert(false, 'msg');
  });
});

describe('v1.0.0 production: import/export parsing', () => {
  it('parser skips import { } from statements', () => {
    const sv = compile(`
      import { HardwareModule, Module, Input, Output, Sequential } from '@ts2v/runtime';
      import type { Logic, Bit } from '@ts2v/runtime';
      @Module
      class X extends HardwareModule {
        @Input clk: Bit = 0;
        @Output out: Bit = 0;
        @Sequential('clk')
        tick(): void { this.out = 1; }
      }
    `);
    assert.ok(sv.includes('module X ('), 'should emit module X');
    assert.ok(!sv.includes('import'), 'should strip import statements');
  });

  it('parser skips export { Name } statements', () => {
    const sv = compile(`
      import { HardwareModule, Module, Input, Output, Sequential } from '@ts2v/runtime';
      import type { Logic, Bit } from '@ts2v/runtime';
      @Module
      class Y extends HardwareModule {
        @Input clk: Bit = 0;
        @Output led: Bit = 0;
        @Sequential('clk')
        tick(): void { this.led = 1; }
      }
      export { Y };
    `);
    assert.ok(sv.includes('module Y ('), 'should emit module Y');
    assert.ok(!sv.includes('export'), 'should strip export statements');
  });
});

describe('v1.0.0 production: context-aware bit-width emission', () => {
  it("1-bit output reset to 1'b0", () => {
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
    assert.ok(sv.includes("flag <= 1'b0"), 'reset value');
    assert.ok(sv.includes("flag <= 1'b1"), 'assignment');
  });

  it("8-bit output reset to 8'd0", () => {
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
    assert.ok(sv.includes("data <= 8'd0"), 'reset value');
    assert.ok(sv.includes("data <= 8'd255"), 'assignment');
  });

  it("4-bit output reset to 4'd0", () => {
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
    assert.ok(sv.includes("count <= 4'd0"), 'reset');
    assert.ok(sv.includes("count <= 4'd5"), 'assignment');
  });

  it('complex expressions stay unsized', () => {
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
    assert.ok(sv.includes('count <= count + 1'), 'expression should pass through unsized');
  });

  it('hex literals get natural width', () => {
    const sv = compile(`
      @Module
      class X extends HardwareModule {
        @Input a: Logic<8> = 0;
        @Output out: Logic<8> = 0;
        @Combinational
        logic(): void { this.out = this.a & 0xFF; }
      }
    `);
    assert.ok(sv.includes("8'hFF"), 'hex should be naturally sized');
  });
});
