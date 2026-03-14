// ws2812_serialiser.ts — WS2812 NeoPixel protocol serialiser.
//
// Converts a latched 24-bit GRB colour frame into the WS2812 serial waveform.
// Protocol timing at 27 MHz (≈37 ns/clock):
//   Reset pulse : ≥50 µs (1 600 clocks used)
//   '0' bit     : 10 clocks high (~370 ns) + 24 clocks low
//   '1' bit     : 19 clocks high (~703 ns) + 15 clocks low
//   Bit period  : 34 clocks (~1.26 µs)
//
// Usage: assert `load` for exactly one clock with a valid `frame` on the input
// to trigger a new transmission.  `ws2812` carries the serialised waveform.

import { HardwareModule, Module, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class Ws2812Serialiser extends HardwareModule {
    // ── Ports ──────────────────────────────────────────────────────────────
    @Input clk: Bit = 0;  // 27 MHz system clock
    @Input frame: Logic<24> = 0;  // GRB colour frame to transmit
    @Input load: Bit = 0;  // pulse high for one cycle to start TX
    @Output ws2812: Bit = 0;  // WS2812 serial data line

    // ── Timing constants (all in clock cycles) ─────────────────────────────
    private readonly T1H: Logic<6> = 19;    // '1' high phase
    private readonly T0H: Logic<6> = 10;    // '0' high phase
    private readonly TBIT: Logic<6> = 34;    // full bit period
    private readonly TRESET: Logic<12> = 1600;  // reset pulse length

    // ── State ──────────────────────────────────────────────────────────────
    private latchedFrame: Logic<24> = 0;  // captured on load pulse
    private bitIndex: Logic<5> = 0;  // 0–23, MSB first
    private tickInBit: Logic<6> = 0;  // position within current bit
    private resetTicks: Logic<12> = 0;  // counts the reset-low phase
    private sending: Bit = 0;  // 1 = actively transmitting
    private loadPrev: Bit = 0;  // for rising-edge detection on load

    @Sequential('clk')
    tick(): void {
        // ── Rising-edge detect on load to start a new frame ───────────────
        if (this.loadPrev === 0 && this.load === 1 && this.sending === 0) {
            this.latchedFrame = this.frame;
            this.resetTicks = 0;
            this.bitIndex = 0;
            this.tickInBit = 0;
            this.sending = 1;
        }
        this.loadPrev = this.load;

        // ── Serialiser state machine ──────────────────────────────────────
        if (this.sending === 1) {
            // Phase 1 — reset pulse (data line held low)
            if (this.resetTicks < this.TRESET) {
                this.ws2812 = 0;
                this.resetTicks = this.resetTicks + 1;
            } else {
                // Phase 2 — 24-bit GRB transmission, MSB first
                const bitValue = (this.latchedFrame >> (23 - this.bitIndex)) & 1;
                let highTicks: Logic<6> = 10;
                if (bitValue === 1) {
                    highTicks = 19;
                }
                if (this.tickInBit < highTicks) {
                    this.ws2812 = 1;
                } else {
                    this.ws2812 = 0;
                }
                this.tickInBit = this.tickInBit + 1;
                if (this.tickInBit >= this.TBIT) {
                    this.tickInBit = 0;
                    this.bitIndex = this.bitIndex + 1;
                    if (this.bitIndex >= 24) {
                        this.sending = 0;
                        this.bitIndex = 0;
                    }
                }
            }
        } else {
            this.ws2812 = 0;
        }
    }
}

export { Ws2812Serialiser };
