// aurora_serialiser.ts - 8-pixel WS2812 chain serialiser for Tang Nano 20K.
//
// Drives up to 8 WS2812/WS2812B/WS2812C-2020 pixels in series on a single data line.
// Accepts pixel0..pixel7 as 24-bit GRB values.  Sends them in order (pixel0 first)
// then issues a 370 µs reset pulse.  The strip latches all pixels on the reset.
//
// Protocol timing at 27 MHz (1 clk = 37.04 ns):
//   T0H = 9 clks  (333 ns)   Bit-0 high time
//   T1H = 19 clks (703 ns)   Bit-1 high time
//   Bit period = 30 clks (1111 ns) - satisfies both WS2812B and WS2812C-2020
//   Reset = 10000 clks (370 µs)  - WS2812C-2020 requires >280 µs
//
// State machine:
//   PHASE_RESET -> drive ws2812 LOW for 10000 clks, latch pixel0 at end, goto PHASE_BITS
//   PHASE_BITS  -> stream 24 bits per pixel MSB-first; advance pixelIdx after each pixel;
//                  after pixel7, goto PHASE_RESET
//
// Non-blocking assignment note: loadNextPixel() is inlined at call site AFTER
// pixelIdx is incremented.  Because all SV non-blocking assignments evaluate RHS
// simultaneously, loadNextPixel sees the OLD pixelIdx and must select pixel[idx+1].

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const T0H_CLOCKS  = 9;
const T1H_CLOCKS  = 19;
const TBIT_LAST   = 29;    // 30 clks per bit (0..29)
const TRESET_LAST = 9999;  // 10000 clks = 370 µs
const BITS_LAST   = 23;    // 24 bits per pixel (0..23)
const PIXELS_LAST = 7;     // 8 pixels (0..7)

const PHASE_RESET = 0;
const PHASE_BITS  = 1;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class AuroraSerialiser extends HardwareModule {
    @Input  clk:    Bit       = 0;
    @Input  pixel0: Logic<24> = 0;
    @Input  pixel1: Logic<24> = 0;
    @Input  pixel2: Logic<24> = 0;
    @Input  pixel3: Logic<24> = 0;
    @Input  pixel4: Logic<24> = 0;
    @Input  pixel5: Logic<24> = 0;
    @Input  pixel6: Logic<24> = 0;
    @Input  pixel7: Logic<24> = 0;
    @Output ws2812: Bit       = 0;

    private phase:    Bit        = PHASE_RESET;
    private timer:    Logic<14>  = 0;  // 14 bits: TRESET_LAST (9999) < 2^14
    private pixelIdx: Logic<3>   = 0;  // 0..7
    private bitCnt:   Logic<5>   = 0;  // 0..23
    private shiftReg: Logic<24>  = 0;  // current pixel, MSB at bit [23]

    @Sequential('clk')
    tick(): void {
        if (this.phase === PHASE_RESET) {
            this.tickReset();
            return;
        }
        this.tickBits();
    }

    // Reset phase: hold ws2812 low for TRESET_LAST clocks, then load pixel0.
    private tickReset(): void {
        this.ws2812 = 0;
        if (this.timer === TRESET_LAST) {
            this.timer    = 0;
            this.pixelIdx = 0;
            this.bitCnt   = 0;
            this.shiftReg = this.pixel0;  // always start chain with pixel0
            this.phase    = PHASE_BITS;
        } else {
            this.timer = this.timer + 1;
        }
    }

    // Bits phase: emit 24-bit MSB-first stream for each pixel in turn.
    private tickBits(): void {
        // Drive ws2812 high during the T0H window, and extend through T1H for a '1' bit.
        if (this.timer < T0H_CLOCKS) {
            this.ws2812 = 1;
        } else if (this.timer < T1H_CLOCKS && ((this.shiftReg >> 23) & 1) === 1) {
            this.ws2812 = 1;
        } else {
            this.ws2812 = 0;
        }

        if (this.timer === TBIT_LAST) {
            // End of current bit slot.
            this.timer = 0;
            if (this.bitCnt === BITS_LAST) {
                // All 24 bits of this pixel sent.
                this.bitCnt = 0;
                if (this.pixelIdx === PIXELS_LAST) {
                    // All 8 pixels done -> reset phase.
                    this.pixelIdx = 0;
                    this.phase    = PHASE_RESET;
                } else {
                    // Advance to next pixel.
                    // loadNextPixel() is inlined; it reads OLD pixelIdx to select pixel[idx+1].
                    this.pixelIdx = this.pixelIdx + 1;
                    this.loadNextPixel();
                }
            } else {
                // More bits remaining in this pixel: shift left to expose next bit.
                this.shiftReg = this.shiftReg << 1;
                this.bitCnt   = this.bitCnt + 1;
            }
        } else {
            this.timer = this.timer + 1;
        }
    }

    // Selects pixel at index (old pixelIdx + 1) using old pixelIdx as the selector.
    // Called after pixelIdx = pixelIdx + 1 (non-blocking), so pixelIdx is still OLD.
    // old 0 -> load pixel1, old 1 -> load pixel2, ..., old 6 -> load pixel7.
    private loadNextPixel(): void {
        if (this.pixelIdx === 0) {
            this.shiftReg = this.pixel1;
        } else if (this.pixelIdx === 1) {
            this.shiftReg = this.pixel2;
        } else if (this.pixelIdx === 2) {
            this.shiftReg = this.pixel3;
        } else if (this.pixelIdx === 3) {
            this.shiftReg = this.pixel4;
        } else if (this.pixelIdx === 4) {
            this.shiftReg = this.pixel5;
        } else if (this.pixelIdx === 5) {
            this.shiftReg = this.pixel6;
        } else {
            // pixelIdx === 6: load pixel7 (the last pixel)
            this.shiftReg = this.pixel7;
        }
    }
}

export { AuroraSerialiser };
