// ws2812_stdlib.ts - Single WS2812 LED driven via @ts2v/stdlib Ws2812Serialiser
// Cycles through a fixed rainbow palette. Same as ws2812_demo but uses
// the stdlib module directly. WS2812 data pin = 79.
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/ws2812-stdlib \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/ws2812-stdlib

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { Ws2812Serialiser } from './Ws2812Serialiser';

const HUE_STEP  = 1;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class Ws2812Stdlib extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output ws2812: Bit = 0;
    @Output led: Logic<6> = 0x3F;

    private frame: Logic<24> = 0;
    private hue: Logic<8> = 0;
    private tick_cnt: Logic<21> = 0;

    @Submodule ser = new Ws2812Serialiser();

    @Sequential('clk')
    tick(): void {
        this.tick_cnt = this.tick_cnt + 1;
        if (this.tick_cnt === 0) {
            this.hue = this.hue + HUE_STEP;
            this.updateFrame();
        }
    }

    private updateFrame(): void {
        if (this.hue < 85) {
            this.frame = ((this.hue * 3) << 16) | (((84 - this.hue) * 3) << 8);
        } else if (this.hue < 170) {
            this.frame = (((169 - this.hue) * 3) << 16) | ((this.hue - 85) * 3);
        } else {
            this.frame = (((this.hue - 170) * 3) << 8) | ((254 - this.hue) * 3);
        }
    }
}

export { Ws2812Stdlib };
