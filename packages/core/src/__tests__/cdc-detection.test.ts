import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compileClassModule } from '../compiler/class-compiler/class-module-compiler';

describe('CDC Detection', () => {
  it('unguarded cross-domain signal emits warning to console', () => {
    const warnings: string[] = [];
    const orig = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));
    try {
      compileClassModule(`
                @Module
                @ModuleConfig('resetSignal: "no_rst"')
                class DualClk extends HardwareModule {
                    @Input  clk_a: Bit = 0;
                    @Input  clk_b: Bit = 0;
                    @Output out: Logic<1> = 0;
                    private shared: Logic<1> = 0;

                    @Sequential('clk_a')
                    domainA(): void { this.shared = 1; }

                    @Sequential('clk_b')
                    domainB(): void { this.out = this.shared; }
                }
            `);
    } finally {
      console.warn = orig;
    }
    assert.ok(
      warnings.some((w) => w.includes('CDC warning') && w.includes('shared')),
      `Expected CDC warning for 'shared'; got: ${warnings.join('; ')}`,
    );
  });

  it('two-FF ClockDomainCrossing suppresses CDC warning', () => {
    const warnings: string[] = [];
    const orig = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));
    try {
      compileClassModule(`
                @Module
                @ModuleConfig('resetSignal: "no_rst"')
                class SafeCross extends HardwareModule {
                    @Input  clk_a: Bit = 0;
                    @Input  clk_b: Bit = 0;
                    @Output out: Logic<1> = 0;

                    @Submodule cdc = new ClockDomainCrossing();

                    @Sequential('clk_b')
                    domainB(): void { this.out = this.d_out; }
                }
            `);
    } finally {
      console.warn = orig;
    }
    assert.ok(
      !warnings.some((w) => w.includes('CDC warning')),
      `No CDC warning expected; got: ${warnings.join('; ')}`,
    );
  });

  it('AsyncFifo suppresses CDC warning', () => {
    const warnings: string[] = [];
    const orig = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));
    try {
      compileClassModule(`
                @Module
                @ModuleConfig('resetSignal: "no_rst"')
                class FifoCross extends HardwareModule {
                    @Input  wr_clk: Bit = 0;
                    @Input  rd_clk: Bit = 0;
                    @Output rd_data: Logic<8> = 0;

                    @Submodule fifo = new AsyncFifo();

                    @Sequential('rd_clk')
                    domainRd(): void { this.rd_data = 0; }
                }
            `);
    } finally {
      console.warn = orig;
    }
    assert.ok(
      !warnings.some((w) => w.includes('CDC warning')),
      `No CDC warning expected for AsyncFifo; got: ${warnings.join('; ')}`,
    );
  });

  it('multi-domain SV output has two always_ff blocks with different clocks', () => {
    const result = compileClassModule(`
            @Module
            @ModuleConfig('resetSignal: "no_rst"')
            class MultiDomain extends HardwareModule {
                @Input  clk_sys: Bit = 0;
                @Input  clk_usb: Bit = 0;
                @Output out_sys: Logic<1> = 0;
                @Output out_usb: Logic<1> = 0;

                @Sequential('clk_sys')
                sysLogic(): void { this.out_sys = 1; }

                @Sequential('clk_usb')
                usbLogic(): void { this.out_usb = 1; }
            }
        `);
    assert.ok(result.success, result.errors.join(', '));
    const sv = result.systemverilog;
    assert.ok(sv.includes('posedge clk_sys'), 'Should have clk_sys sensitivity');
    assert.ok(sv.includes('posedge clk_usb'), 'Should have clk_usb sensitivity');
    const alwaysBlocks = sv.match(/always_ff/g);
    assert.ok(alwaysBlocks && alwaysBlocks.length >= 2, 'Should have at least 2 always_ff blocks');
  });

  it('ClockDomainCrossing submodule includes two-FF SV module definition', () => {
    const result = compileClassModule(`
            @Module
            @ModuleConfig('resetSignal: "rst_n"')
            class WithCdc extends HardwareModule {
                @Input  clk_dst: Bit = 0;
                @Input  rst_n: Bit = 0;
                @Input  d_in: Bit = 0;
                @Output result: Logic<1> = 0;

                @Submodule sync = new ClockDomainCrossing();

                @Sequential('clk_dst')
                grab(): void { this.result = this.d_out; }
            }
        `);
    assert.ok(result.success, result.errors.join(', '));
    assert.ok(
      result.systemverilog.includes('module ClockDomainCrossing'),
      'SV should contain ClockDomainCrossing module definition',
    );
    assert.ok(result.systemverilog.includes('ASYNC_REG'), 'Should include ASYNC_REG attribute');
  });
});
