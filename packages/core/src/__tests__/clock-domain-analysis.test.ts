import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ClassModuleParser } from '../compiler/class-compiler/class-module-compiler';

describe('Clock Domain AST Extension', () => {
  it('parses a single @ClockDomain decorator', () => {
    const src = `
            @ClockDomain('sys', { freq: 27000000 })
            @Module
            class Top extends HardwareModule {
                @Input clk: Bit = 0;
                @Output led: Logic<6> = 0;
                @Sequential('clk')
                tick(): void { this.led = 0; }
            }
        `;
    const parser = new ClassModuleParser(src);
    const result = parser.parse();
    assert.equal(result.modules.length, 1);
    const mod = result.modules[0];
    assert.equal(mod.clocks.length, 1);
    assert.equal(mod.clocks[0].name, 'sys');
    assert.equal(mod.clocks[0].freq, 27000000);
  });

  it('parses multiple @ClockDomain decorators', () => {
    const src = `
            @ClockDomain('sys', { freq: 27000000 })
            @ClockDomain('usb', { freq: 48000000 })
            @Module
            class DualClock extends HardwareModule {
                @Input clk: Bit = 0;
                @Output out: Logic<1> = 0;
            }
        `;
    const parser = new ClassModuleParser(src);
    const result = parser.parse();
    const mod = result.modules[0];
    assert.equal(mod.clocks.length, 2);
    assert.equal(mod.clocks[0].name, 'sys');
    assert.equal(mod.clocks[1].name, 'usb');
    assert.equal(mod.clocks[1].freq, 48000000);
  });

  it('throws on duplicate @ClockDomain name', () => {
    const src = `
            @ClockDomain('sys', { freq: 27000000 })
            @ClockDomain('sys', { freq: 50000000 })
            @Module
            class DupClock extends HardwareModule {
                @Input clk: Bit = 0;
            }
        `;
    const parser = new ClassModuleParser(src);
    assert.throws(() => parser.parse(), /Duplicate @ClockDomain name 'sys'/);
  });

  it('parses @Sequential with clock domain binding', () => {
    const src = `
            @ClockDomain('sys', { freq: 27000000 })
            @ClockDomain('usb', { freq: 48000000 })
            @Module
            class Multi extends HardwareModule {
                @Input clk: Bit = 0;
                @Input usb_clk: Bit = 0;
                @Output flag: Logic<1> = 0;
                @Sequential('usb_clk', { clock: 'usb' })
                usbTick(): void { this.flag = 1; }
            }
        `;
    const parser = new ClassModuleParser(src);
    const result = parser.parse();
    const mod = result.modules[0];
    const method = mod.methods.find((m) => m.name === 'usbTick');
    assert.ok(method, 'usbTick method should exist');
    assert.equal(method!.clock, 'usb_clk');
    assert.equal(method!.clock_domain, 'usb');
  });

  it('module without @ClockDomain has empty clocks array', () => {
    const src = `
            @Module
            class Simple extends HardwareModule {
                @Input clk: Bit = 0;
                @Output out: Logic<1> = 0;
            }
        `;
    const parser = new ClassModuleParser(src);
    const result = parser.parse();
    const mod = result.modules[0];
    assert.deepEqual(mod.clocks, []);
  });
});
