import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// WS2812B/WS2812C-2020 protocol serialiser.
// GRB byte order: frame[23:16]=G, frame[15:8]=R, frame[7:0]=B.
//
// Timing at 27 MHz (37 ns/clock):
//   T0H = 9 clocks (333 ns), T1H = 19 clocks (703 ns)
//   Bit period = 30 clocks (1111 ns)
//   Reset pulse = 10000 clocks (370 us) - latches all pixels
//
// FSM: PHASE_RESET -> PHASE_BITS (24 bits MSB-first) -> PHASE_RESET

const WS_T0H_CLOCKS  = 9;
const WS_T1H_CLOCKS  = 19;
const WS_TBIT_LAST   = 29;
const WS_TRESET_LAST = 9999;
const WS_BITS_LAST   = 23;
const WS_PHASE_RESET = 0;
const WS_PHASE_BITS  = 1;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class Ws2812Serialiser extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  frame: Logic<24> = 0;
    @Output ws2812: Bit = 0;

    private phase: Bit = WS_PHASE_RESET;
    private timer: Logic<14> = 0;
    private shiftReg: Logic<24> = 0;
    private bitCnt: Logic<5> = 0;

    @Sequential('clk')
    tick(): void {
        if (this.phase === WS_PHASE_RESET) {
            this.tickReset();
            return;
        }
        this.tickBits();
    }

    private tickReset(): void {
        this.ws2812 = 0;
        if (this.timer === WS_TRESET_LAST) {
            this.shiftReg = this.frame;
            this.timer = 0;
            this.bitCnt = 0;
            this.phase = WS_PHASE_BITS;
        } else {
            this.timer = this.timer + 1;
        }
    }

    private tickBits(): void {
        if (this.timer < WS_T0H_CLOCKS) {
            this.ws2812 = 1;
        } else if (this.timer < WS_T1H_CLOCKS && ((this.shiftReg >> 23) & 1) === 1) {
            this.ws2812 = 1;
        } else {
            this.ws2812 = 0;
        }
        if (this.timer === WS_TBIT_LAST) {
            this.timer = 0;
            this.shiftReg = this.shiftReg << 1;
            if (this.bitCnt === WS_BITS_LAST) {
                this.bitCnt = 0;
                this.phase = WS_PHASE_RESET;
            } else {
                this.bitCnt = this.bitCnt + 1;
            }
        } else {
            this.timer = this.timer + 1;
        }
    }
}

export { Ws2812Serialiser };
