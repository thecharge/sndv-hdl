// ws2812_serialiser.ts - WS2812 NeoPixel protocol serialiser.
//
// Converts a latched 24-bit GRB colour frame into the WS2812 serial waveform.
// Protocol timing at 27 MHz (approx 37 ns per clock):
//   Reset pulse : min 50 us -> 1350 clocks minimum, 1600 used for margin
//   '0' bit     : 10 clocks high (~370 ns) + 24 clocks low (~888 ns)
//   '1' bit     : 19 clocks high (~703 ns) + 15 clocks low (~555 ns)
//   Bit period  : 34 clocks (~1.26 us)
//   Full frame  : 1600 + 24*34 = 2416 clocks (~89 us)
//
// Continuous refresh: when enable is high and a frame finishes transmitting,
// the module immediately re-latches the current frame and starts a new
// transmission. This keeps the WS2812 LEDs lit continuously.
//
// When enable goes low mid-transmission the current frame completes, then
// the output goes dark.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// Timing constants for 27 MHz clock.
// All values are in clock cycles.
const T1H_CLOCKS = 19;   // '1' bit high time
const T0H_CLOCKS = 10;   // '0' bit high time
const TBIT_CLOCKS = 34;  // full bit period (T1H + T1L = T0H + T0L)
const TRESET_CLOCKS = 1600; // reset low time before first bit
const BITS_PER_FRAME = 24;  // GRB = 8G + 8R + 8B

@Module
@ModuleConfig('resetSignal: "no_rst"')
class Ws2812Serialiser extends HardwareModule {
    // Ports
    @Input clk: Bit = 0;  // 27 MHz system clock
    @Input frame: Logic<24> = 0;  // GRB colour word to transmit
    @Input load: Bit = 0;  // pulse high one cycle to latch+send
    @Input enable: Bit = 0;  // 1 = continuous refresh after each frame
    @Output ws2812: Bit = 0;  // WS2812 serial data output

    // Timing constants stored as localparam (readonly)
    private readonly T1H: Logic<6> = T1H_CLOCKS;
    private readonly T0H: Logic<6> = T0H_CLOCKS;
    private readonly TBIT: Logic<6> = TBIT_CLOCKS;
    private readonly TRESET: Logic<12> = TRESET_CLOCKS;

    // Internal state
    private latchedFrame: Logic<24> = 0;  // frame captured at start of TX
    private bitIndex: Logic<5> = 0;  // current bit (0 = MSB, 23 = LSB)
    private tickInBit: Logic<6> = 0;  // clock within current bit period
    private resetTicks: Logic<12> = 0;  // clock within reset pulse
    private sending: Bit = 0;  // 1 while actively transmitting
    private loadPrev: Bit = 0;  // previous cycle load (edge detect)

    @Sequential('clk')
    tick(): void {
        // Rising edge on load triggers a new frame (only when idle).
        if (this.loadPrev === 0 && this.load === 1 && this.sending === 0) {
            this.latchedFrame = this.frame;
            this.resetTicks = 0;
            this.bitIndex = 0;
            this.tickInBit = 0;
            this.sending = 1;
        }
        this.loadPrev = this.load;

        if (this.sending === 1) {
            // Phase 1: reset low pulse before transmitting bits.
            if (this.resetTicks < this.TRESET) {
                this.ws2812 = 0;
                this.resetTicks = this.resetTicks + 1;
            } else {
                // Phase 2: 24 bits of GRB data, MSB first.
                const bitValue = (this.latchedFrame >> (23 - this.bitIndex)) & 1;
                let highTicks: Logic<6> = T0H_CLOCKS;
                if (bitValue === 1) {
                    highTicks = T1H_CLOCKS;
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
                    if (this.bitIndex >= BITS_PER_FRAME) {
                        // Frame done. If enable is still high, start a new
                        // transmission immediately with the current frame
                        // input to keep the WS2812 refreshed.
                        if (this.enable === 1) {
                            this.latchedFrame = this.frame;
                            this.resetTicks = 0;
                            this.bitIndex = 0;
                            this.tickInBit = 0;
                        } else {
                            this.sending = 0;
                            this.bitIndex = 0;
                        }
                    }
                }
            }
        } else {
            this.ws2812 = 0;
        }
    }
}

export { Ws2812Serialiser };
