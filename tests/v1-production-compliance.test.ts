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
describe('v1.0.0 production: IEEE 1800-2017 compliance', () => {
  it('output contains timescale directive', () => {
    const sv = compile(`
      @Module
      class X extends HardwareModule {
        @Input a: Bit = 0;
        @Output b: Bit = 0;
        @Combinational
        logic(): void { this.b = this.a; }
      }
    `);
    assert.ok(sv.includes('`timescale 1ns / 1ps'), 'timescale');
  });

  it('output contains default_nettype guards', () => {
    const sv = compile(`
      @Module
      class X extends HardwareModule {
        @Input a: Bit = 0;
        @Output b: Bit = 0;
        @Combinational
        logic(): void { this.b = this.a; }
      }
    `);
    assert.ok(sv.includes('`default_nettype none'), 'nettype none');
    assert.ok(sv.includes('`default_nettype wire'), 'nettype wire');
  });

  it('sequential uses always_ff with async reset', () => {
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
    assert.ok(sv.includes('always_ff @(posedge clk or negedge rst_n)'), 'ff sensitivity');
    assert.ok(sv.includes('if (!rst_n)'), 'reset condition');
  });

  it('combinational uses always_comb', () => {
    const sv = compile(`
      @Module
      class X extends HardwareModule {
        @Input a: Logic<8> = 0;
        @Output b: Logic<8> = 0;
        @Combinational
        logic(): void { this.b = this.a; }
      }
    `);
    assert.ok(sv.includes('always_comb begin'), 'always_comb');
  });

  it('enum generates typedef enum logic', () => {
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
    assert.ok(sv.includes('typedef enum logic'), 'typedef enum');
    assert.ok(sv.includes("IDLE = 2'd0"), 'enum value');
  });

  it('v2.0.0 header is present', () => {
    const sv = compile(`
      @Module
      class X extends HardwareModule {
        @Input a: Bit = 0;
        @Output b: Bit = 0;
        @Combinational
        logic(): void { this.b = this.a; }
      }
    `);
    assert.ok(sv.includes('v2.0.0'), 'version header');
  });
});
