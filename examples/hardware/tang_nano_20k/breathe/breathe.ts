// breathe.ts — Tang Nano 20K breathing LED demo.
//
// PwmCore generates a PWM waveform at the given duty cycle.
// BreatheLed sweeps the duty cycle up and down to create a breathing effect.
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/breathe/breathe.ts \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/breathe

import { HardwareModule, Module, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// ── PWM core ────────────────────────────────────────────────────────────────
// Generates a pulse-width modulated output.  duty (0–255) sets the fraction
// of the period that the output is high: 0 = always low, 255 = always high.

@Module
class PwmCore extends HardwareModule {
    @Input clk: Bit = 0;   // system clock
    @Input duty: Logic<8> = 0;   // duty cycle 0–255
    @Output pwm: Bit = 0;   // PWM output

    private counter: Logic<8> = 0;   // 8-bit free-running counter

    @Sequential('clk')
    tick(): void {
        this.counter = this.counter + 1;
        if (this.counter < this.duty) {
            this.pwm = 1;
        } else {
            this.pwm = 0;
        }
    }
}

// ── Breathing LED ────────────────────────────────────────────────────────────
// Connects a PwmCore submodule and sweeps the duty cycle up and down so the
// LED appears to gently breathe.  The period counter slows the sweep to a
// human-visible speed (~1 s full cycle at 27 MHz).

@Module
class BreatheLed extends HardwareModule {
    @Input clk: Bit = 0;   // 27 MHz system clock
    @Input rst_n: Bit = 1;   // active-low reset (S1)
    @Output led: Bit = 0;   // LED output (connect to PwmCore.pwm)

    // ── Intermediate wire — auto-wired to PwmCore.pwm output by name ───────
    private pwm: Bit = 0;

    // ── Duty cycle state ────────────────────────────────────────────────────
    private duty: Logic<8> = 0;   // current duty cycle 0–255
    private step: Logic<24> = 0;   // pace counter — increments every clock
    private dir: Bit = 0;   // 0 = sweeping up, 1 = sweeping down

    // ── Submodule instance ──────────────────────────────────────────────────
    // Auto-wired: clk→clk, duty→duty, pwm←pwm
    @Submodule pwm_core = new PwmCore();

    @Sequential('clk')
    tick(): void {
        // Drive LED from PWM output
        this.led = this.pwm;

        // Advance pace counter every clock; update duty every 2^16 clocks
        this.step = this.step + 1;
        if ((this.step & 0xFFFF) === 0) {
            if (this.dir === 0) {
                if (this.duty === 255) {
                    this.dir = 1;
                } else {
                    this.duty = this.duty + 1;
                }
            } else {
                if (this.duty === 0) {
                    this.dir = 0;
                } else {
                    this.duty = this.duty - 1;
                }
            }
        }
    }
}

export { PwmCore, BreatheLed };
