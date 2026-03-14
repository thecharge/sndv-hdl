// ws2812_serialiser.ts - WS2812B/WS2812C-2020 protocol serialiser.
//
// Protocol (NeoPixel, single-wire, GRB order, MSB first):
//   Reset pulse : ws2812 LOW for > reset threshold
//   Bit '0'     : HIGH for T0H, then LOW for T0L
//   Bit '1'     : HIGH for T1H, then LOW for T1L
//   Data latched: LEDs update when they see the reset after all bit data
//
// Timing at 27 MHz (1 clock = 37.04 ns) - chosen to satisfy both WS2812B
// (the common strip chip) and WS2812C-2020 (on-board Tang Nano 20K LED):
//
//   T0H_CLOCKS  =  9 clk =  333 ns  WS2812B: 250-550ns  WS2812C-2020: 220-380ns
//   T1H_CLOCKS  = 19 clk =  703 ns  WS2812B: 650-950ns  WS2812C-2020: 580-1000ns
//   TBIT_LAST   = 29      -> 30 clk per bit = 1111 ns  (shared T0+T1 period)
//                           WS2812B:  ~1250ns  WS2812C-2020:  ~1000ns
//   T0L         = 21 clk =  777 ns  WS2812B: 700-1000ns WS2812C-2020: 580-1600ns
//   T1L         = 11 clk =  407 ns  WS2812B: 300-600ns  WS2812C-2020: 220-420ns
//
//   TRESET_LAST = 9999    -> 10000 clk = 370 µs conservative reset
//                           WS2812B needs > 50 µs, WS2812C-2020 needs > 280 µs
//
// FSM runs continuously (no enable input):
//   PHASE_RESET -> ws2812 LOW, count 10000 clocks, latch frame at END
//   PHASE_BITS  -> emit 24 bits MSB-first from shiftReg; after each bit
//                  shift left (bringing next bit to [23]).  After bit 23
//                  go back to PHASE_RESET.
//
// To blank the LED, supply frame = 0x000000 (GRB_BLACK).  The serialiser
// sends that frame within at most one full cycle (~0.4 ms) and the LED
// latches black.  Holding the data line low is NOT sufficient - the LED
// holds its last latched colour and only updates on a new frame + reset.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const T0H_CLOCKS = 9;
const T1H_CLOCKS = 19;
const TBIT_LAST = 29;    // timer counts 0..29 = 30 clocks per bit
const TRESET_LAST = 9999;  // timer counts 0..9999 = 10000 clocks = 370 µs
const BITS_LAST = 23;    // bit counter 0..23 = 24 bits
const PHASE_RESET = 0;
const PHASE_BITS = 1;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class Ws2812Serialiser extends HardwareModule {
    @Input clk: Bit = 0;
    @Input frame: Logic<24> = 0;  // GRB24: [23:16]=G [15:8]=R [7:0]=B
    @Output ws2812: Bit = 0;

    private phase: Bit = PHASE_RESET;
    private timer: Logic<14> = 0;  // wide enough for TRESET_LAST (9999 < 2^14)
    private shiftReg: Logic<24> = 0;  // MSB-first; shiftReg[23] = current bit
    private bitCnt: Logic<5> = 0;  // 0..BITS_LAST

    @Sequential('clk')
    tick(): void {
        if (this.phase === PHASE_RESET) {
            this.tickResetPhase();
            return;
        }
        this.tickBitsPhase();
    }

    private tickResetPhase(): void {
        this.ws2812 = 0;
        if (this.timer === TRESET_LAST) {
            // End of reset: latch the frame and begin transmission.
            this.shiftReg = this.frame;
            this.timer = 0;
            this.bitCnt = 0;
            this.phase = PHASE_BITS;
        } else {
            this.timer = this.timer + 1;
        }
    }

    private tickBitsPhase(): void {
        // shiftReg[23] is the current bit. T0H portion is always HIGH.
        // T1H extends to T1H_CLOCKS for a '1' bit, then goes LOW.
        if (this.timer < T0H_CLOCKS) {
            this.ws2812 = 1;
        } else if (this.timer < T1H_CLOCKS && ((this.shiftReg >> 23) & 1) === 1) {
            this.ws2812 = 1;
        } else {
            this.ws2812 = 0;
        }

        if (this.timer === TBIT_LAST) {
            // End of this bit: shift left to expose the next bit, advance counter.
            this.timer = 0;
            this.shiftReg = this.shiftReg << 1;
            if (this.bitCnt === BITS_LAST) {
                this.bitCnt = 0;
                this.phase = PHASE_RESET;
            } else {
                this.bitCnt = this.bitCnt + 1;
            }
        } else {
            this.timer = this.timer + 1;
        }
    }
}

export { Ws2812Serialiser };
