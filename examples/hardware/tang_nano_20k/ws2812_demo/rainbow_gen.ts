// rainbow_gen.ts — Smooth rainbow colour generator for WS2812.
//
// Cycles through six vivid hues (GRB byte order).  When `enable` is high,
// the colour advances one step every 2^23 clocks (≈0.31 s at 27 MHz), making
// a full rainbow revolution in ≈1.87 s.
//
// Outputs:
//   frame     — current 24-bit GRB colour word, continuous.
//   load      — pulses high for exactly one clock when the colour changes,
//               used to trigger the Ws2812Serialiser.
//
// When `enable` is de-asserted the generator resets (frame = black, step = 0)
// so the next assertion always starts from red.

import { HardwareModule, Module, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// Six-step rainbow palette in GRB byte order:
//   Byte layout: [23:16] = G, [15:8] = R, [7:0] = B
//   STEP_0  0x00CC00  — RED    (G=00 R=CC B=00)
//   STEP_1  0xCCCC00  — YELLOW (G=CC R=CC B=00)
//   STEP_2  0xCC0000  — GREEN  (G=CC R=00 B=00)
//   STEP_3  0xCC00CC  — CYAN   (G=CC R=00 B=CC)
//   STEP_4  0x0000CC  — BLUE   (G=00 R=00 B=CC)
//   STEP_5  0x00CCCC  — MAGENTA(G=00 R=CC B=CC)

@Module
class RainbowGen extends HardwareModule {
    // ── Ports ──────────────────────────────────────────────────────────────
    @Input clk: Bit = 0;       // 27 MHz system clock
    @Input enable: Bit = 0;       // 1 = cycling; 0 = output off
    @Output frame: Logic<24> = 0;       // current GRB colour
    @Output load: Bit = 0;       // pulses 1 cycle when colour changes

    // ── State ──────────────────────────────────────────────────────────────
    private phase: Logic<26> = 0;  // free-running counter (lower 23 bits = dwell timer)
    private step: Logic<3> = 0;  // 0–5, current colour index

    @Sequential('clk')
    tick(): void {
        this.load = 0;  // default: no trigger

        if (this.enable === 1) {
            this.phase = this.phase + 1;

            // Lower 23 bits roll over → advance to next colour step
            if ((this.phase & 0x7FFFFF) === 0) {
                this.load = 1;  // signal the serialiser
                if (this.step === 5) {
                    this.step = 0;
                } else {
                    this.step = this.step + 1;
                }
            }

            // Map current step → GRB palette entry
            if (this.step === 0) {
                this.frame = 0x00CC00;  // RED
            } else if (this.step === 1) {
                this.frame = 0xCCCC00;  // YELLOW
            } else if (this.step === 2) {
                this.frame = 0xCC0000;  // GREEN
            } else if (this.step === 3) {
                this.frame = 0xCC00CC;  // CYAN
            } else if (this.step === 4) {
                this.frame = 0x0000CC;  // BLUE
            } else {
                this.frame = 0x00CCCC;  // MAGENTA
            }
        } else {
            // Button released: reset generator so next press starts from RED
            this.phase = 0;
            this.step = 0;
            this.frame = 0x000000;  // black / off
        }
    }
}

export { RainbowGen };
