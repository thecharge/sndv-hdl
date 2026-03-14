// ws2812_serialiser.ts - WS2812 NeoPixel protocol serialiser.
//
// Protocol timing at 27 MHz (approx 37 ns per clock):
//   Reset pulse : 1600 clocks (>59 us, spec requires >50 us)
//   '0' bit     : 10 clocks high (~370 ns) + 24 clocks low (~888 ns)
//   '1' bit     : 19 clocks high (~703 ns) + 15 clocks low (~555 ns)
//   Bit period  : 34 clocks (~1.26 us)
//   Full frame  : 1600 + 24*34 = 2416 clocks (~89 us)
//
// Behaviour:
//   enable = 0 -> ws2812 held low, all state reset.
//   enable = 1 -> continuously transmit frame: reset pulse then 24 bits,
//                 then immediately restart.  frame is sampled at the start
//                 of each new reset pulse so that colour changes from
//                 RainbowGen are visible on the next refresh cycle.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const T1H_CLOCKS = 19;
const T0H_CLOCKS = 10;
const TBIT_CLOCKS = 34;
const TRESET_CLOCKS = 1600;
const BITS_PER_FRAME = 24;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class Ws2812Serialiser extends HardwareModule {
    @Input clk: Bit = 0;
    @Input frame: Logic<24> = 0;
    @Input enable: Bit = 0;
    @Output ws2812: Bit = 0;

    private readonly T1H: Logic<6> = T1H_CLOCKS;
    private readonly T0H: Logic<6> = T0H_CLOCKS;
    private readonly TBIT: Logic<6> = TBIT_CLOCKS;
    private readonly TRESET: Logic<12> = TRESET_CLOCKS;

    private latchedFrame: Logic<24> = 0;
    private bitIndex: Logic<5> = 0;
    private tickInBit: Logic<6> = 0;
    private resetTicks: Logic<12> = 0;
    // phase: 0 = idle/reset-pulse, 1 = data bits
    private phase: Bit = 0;
    // currentBit is latched at tickInBit===0 (start of each bit period) and
    // held stable for the full 34-clock bit window.
    private currentBit: Bit = 0;

    @Sequential('clk')
    tick(): void {
        if (this.enable === 0) {
            // Not enabled: hold output low, reset everything.
            this.ws2812 = 0;
            this.phase = 0;
            this.resetTicks = 0;
            this.bitIndex = 0;
            this.tickInBit = 0;
            this.currentBit = 0;
        } else if (this.phase === 0) {
            // Phase 0: reset low pulse.  Latch frame at the start.
            this.ws2812 = 0;
            if (this.resetTicks === 0) {
                this.latchedFrame = this.frame;
            }
            this.resetTicks = this.resetTicks + 1;
            if (this.resetTicks >= TRESET_CLOCKS) {
                this.resetTicks = 0;
                this.bitIndex = 0;
                this.tickInBit = 0;
                this.phase = 1;
            }
        } else {
            // Phase 1: transmit 24 bits MSB-first.
            // Latch the bit value at the start of each bit period.
            if (this.tickInBit === 0) {
                this.currentBit = (this.latchedFrame >> (BITS_PER_FRAME - 1 - this.bitIndex)) & 1;
            }
            if (this.tickInBit < T0H_CLOCKS) {
                this.ws2812 = 1;
            } else if (this.tickInBit < T1H_CLOCKS && this.currentBit === 1) {
                this.ws2812 = 1;
            } else {
                this.ws2812 = 0;
            }
            this.tickInBit = this.tickInBit + 1;
            if (this.tickInBit >= TBIT_CLOCKS) {
                this.tickInBit = 0;
                this.bitIndex = this.bitIndex + 1;
                if (this.bitIndex >= BITS_PER_FRAME) {
                    // Frame complete: go back to reset phase (re-latch frame).
                    this.phase = 0;
                }
            }
        }
    }
}

export { Ws2812Serialiser };
