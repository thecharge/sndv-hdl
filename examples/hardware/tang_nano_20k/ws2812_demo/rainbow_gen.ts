// rainbow_gen.ts - Smooth rainbow colour generator for WS2812.
//
// Cycles through six vivid hues in GRB byte order.
// GRB byte layout: [23:16] = G, [15:8] = R, [7:0] = B
//
// Palette (six steps):
//   STEP 0: RED    (G=00 R=CC B=00) -> 0x00CC00
//   STEP 1: YELLOW (G=CC R=CC B=00) -> 0xCCCC00
//   STEP 2: GREEN  (G=CC R=00 B=00) -> 0xCC0000
//   STEP 3: CYAN   (G=CC R=00 B=CC) -> 0xCC00CC
//   STEP 4: BLUE   (G=00 R=00 B=CC) -> 0x0000CC
//   STEP 5: MAGENTA(G=00 R=CC B=CC) -> 0x00CCCC
//
// When enable is high the colour advances every DWELL_CLOCKS (approx 0.31 s
// at 27 MHz).  The load output pulses for one clock on each colour change to
// trigger the Ws2812Serialiser.
//
// When enable is de-asserted, state resets so the next assertion always
// restarts from the first colour.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// Clock dwell between colour changes.
// At 27 MHz, 2^23 = 8388608 clocks = approx 0.31 s per colour.
const DWELL_MASK = 0x7FFFFF; // lower 23 bits
const MAX_STEP = 5;        // six steps: 0 through 5

// GRB palette entries
const GRB_RED = 0x00CC00;
const GRB_YELLOW = 0xCCCC00;
const GRB_GREEN = 0xCC0000;
const GRB_CYAN = 0xCC00CC;
const GRB_BLUE = 0x0000CC;
const GRB_MAGENTA = 0x00CCCC;
const GRB_BLACK = 0x000000;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class RainbowGen extends HardwareModule {
    // Ports
    @Input clk: Bit = 0;  // 27 MHz system clock
    @Input enable: Bit = 0;  // 1 = cycling, 0 = off and reset
    @Output frame: Logic<24> = 0;  // current GRB colour word
    @Output load: Bit = 0;  // pulses 1 clock when colour changes

    // Internal state
    private phase: Logic<26> = 0;  // free-running dwell counter
    private step: Logic<3> = 0;  // current colour index: 0 to 5

    @Sequential('clk')
    tick(): void {
        this.load = 0;  // default: no trigger this cycle

        if (this.enable === 1) {
            this.phase = this.phase + 1;

            // Lower 23 bits roll over -> advance to next colour step
            if ((this.phase & DWELL_MASK) === 0) {
                this.load = 1;  // trigger serialiser
                if (this.step === MAX_STEP) {
                    this.step = 0;
                } else {
                    this.step = this.step + 1;
                }
            }

            // Map current step to GRB palette entry
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
            // Reset so next enable assertion starts from step 0 (RED)
            this.phase = 0;
            this.step = 0;
            this.frame = GRB_BLACK;
        }
    }
}

export { RainbowGen };
