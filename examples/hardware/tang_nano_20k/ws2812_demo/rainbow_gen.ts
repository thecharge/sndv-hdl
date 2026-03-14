// rainbow_gen.ts - Smooth rainbow colour generator for WS2812.
//
// GRB byte layout: [23:16] = G, [15:8] = R, [7:0] = B
//
// Palette:
//   STEP 0: RED     -> 0x00CC00
//   STEP 1: YELLOW  -> 0xCCCC00
//   STEP 2: GREEN   -> 0xCC0000
//   STEP 3: CYAN    -> 0xCC00CC
//   STEP 4: BLUE    -> 0x0000CC
//   STEP 5: MAGENTA -> 0x00CCCC
//
// When enable is high, frame cycles through the six palette entries.
// Each colour is held for 2^23 clocks (~0.31 s at 27 MHz).
// The counter only advances while enable is high.
// When enable goes low, state resets so the next press always starts at RED.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// Lower 23 bits of the dwell counter roll over for each colour step.
const DWELL_MASK = 0x7FFFFF;
const MAX_STEP = 5;

// GRB palette entries.
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
    @Input  clk:    Bit      = 0;
    @Input  enable: Bit      = 0;
    @Output frame:  Logic<24> = 0;

    private phase: Logic<26> = 0;
    private step:  Logic<3>  = 0;

    @Sequential('clk')
    tick(): void {
        if (this.enable === 1) {
            this.phase = this.phase + 1;

            // Advance colour step every 2^23 clocks.
            // Start the counter at 1 to avoid an immediate step on phase==0.
            if ((this.phase & DWELL_MASK) === 0 && this.phase !== 0) {
                if (this.step === MAX_STEP) {
                    this.step = 0;
                } else {
                    this.step = this.step + 1;
                }
            }

            if (this.step === 0) {
                this.frame = GRB_RED;
            } else if (this.step === 1) {
                this.frame = GRB_YELLOW;
            } else if (this.step === 2) {
                this.frame = GRB_GREEN;
            } else if (this.step === 3) {
                this.frame = GRB_CYAN;
            } else if (this.step === 4) {
                this.frame = GRB_BLUE;
            } else {
                this.frame = GRB_MAGENTA;
            }
        } else {
            this.phase = 0;
            this.step  = 0;
            this.frame = GRB_BLACK;
        }
    }
}

export { RainbowGen };
