// pwm_fade.ts - PWM LED fade example for Tang Nano 20K
// Smoothly fades all 6 onboard LEDs (active-low) using a PWM generator.
// A slow counter ramps duty cycle up and down to create a breathing effect.
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/pwm-fade \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/pwm-fade

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { PwmGenerator } from './PwmGenerator';

// Fade rate: update duty every 2^16 clocks (~2.4ms at 27MHz)
const FADE_SHIFT = 16;
// PWM period matches PwmGenerator (1000 ticks)
const FADE_MAX = 999;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class PwmFade extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output led: Logic<6> = 0x3F;

    private duty: Logic<16> = 0;
    private pwm_out: Bit = 0;
    private fade_cnt: Logic<32> = 0;
    private rising_edge: Bit = 0;

    @Submodule pwm = new PwmGenerator();

    @Sequential('clk')
    tick(): void {
        this.fade_cnt = this.fade_cnt + 1;
        if ((this.fade_cnt & ((1 << FADE_SHIFT) - 1)) === 0) {
            if (this.rising_edge === 1) {
                if (this.duty >= FADE_MAX) {
                    this.rising_edge = 0;
                } else {
                    this.duty = this.duty + 1;
                }
            } else {
                if (this.duty === 0) {
                    this.rising_edge = 1;
                } else {
                    this.duty = this.duty - 1;
                }
            }
        }
        if (this.pwm_out === 0) {
            this.led = 0x00;
        } else {
            this.led = 0x3F;
        }
    }
}

export { PwmFade };
