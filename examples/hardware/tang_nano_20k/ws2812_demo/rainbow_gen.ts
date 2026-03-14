// rainbow_gen.ts - 6-hue rainbow colour sequencer for WS2812 strip.
//
// GRB byte layout: frame[23:16] = Green, [15:8] = Red, [7:0] = Blue.
//
// Palette (0x00RRGG hex with GRB byte order):
//   Step 0: RED     = 0x00CC00  (G=0x00, R=0xCC, B=0x00)
//   Step 1: YELLOW  = 0xCCCC00  (G=0xCC, R=0xCC, B=0x00)
//   Step 2: GREEN   = 0xCC0000  (G=0xCC, R=0x00, B=0x00)
//   Step 3: CYAN    = 0xCC00CC  (G=0xCC, R=0x00, B=0xCC)
//   Step 4: BLUE    = 0x0000CC  (G=0x00, R=0x00, B=0xCC)
//   Step 5: MAGENTA = 0x00CCCC  (G=0x00, R=0xCC, B=0xCC)
//
// When enable is high the internal phase counter increments every clock.
// Every 2^23 clocks (~0.31 s at 27 MHz) the step index advances.
// The guard `phase !== 0` prevents a spurious step advance on the first
// enable clock (where phase & DWELL_MASK happens to be 0).
// When enable goes low, all state resets so the next press always starts RED.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const DWELL_MASK  = 0x7FFFFF;  // lower 23 bits
const MAX_STEP    = 5;

const GRB_RED     = 0x00CC00;
const GRB_YELLOW  = 0xCCCC00;
const GRB_GREEN   = 0xCC0000;
const GRB_CYAN    = 0xCC00CC;
const GRB_BLUE    = 0x0000CC;
const GRB_MAGENTA = 0x00CCCC;
const GRB_BLACK   = 0x000000;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class RainbowGen extends HardwareModule {
    @Input  clk:    Bit       = 0;
    @Input  enable: Bit       = 0;
    @Output frame:  Logic<24> = 0;

    private phase: Logic<26> = 0;  // free-running counter while enabled
    private step:  Logic<3>  = 0;  // 0..5 colour index

    @Sequential('clk')
    tick(): void {
        if (this.enable === 0) {
            this.resetState();
            return;
        }
        this.advanceColour();
    }

    private resetState(): void {
        this.phase = 0;
        this.step  = 0;
        this.frame = GRB_BLACK;
    }

    private advanceColour(): void {
        this.phase = this.phase + 1;

        // Advance step every 2^23 clocks unless we are at phase=0 (start-up guard).
        if ((this.phase & DWELL_MASK) === 0 && this.phase !== 0) {
            if (this.step === MAX_STEP) {
                this.step = 0;
            } else {
                this.step = this.step + 1;
            }
        }

        switch (this.step) {
            case 0: this.frame = GRB_RED;     break;
            case 1: this.frame = GRB_YELLOW;  break;
            case 2: this.frame = GRB_GREEN;   break;
            case 3: this.frame = GRB_CYAN;    break;
            case 4: this.frame = GRB_BLUE;    break;
            default: this.frame = GRB_MAGENTA; break;
        }
    }
}

export { RainbowGen };
