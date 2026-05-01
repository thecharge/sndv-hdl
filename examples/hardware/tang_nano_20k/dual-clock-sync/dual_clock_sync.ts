// dual_clock_sync.ts - CDC two-FF synchroniser example for Tang Nano 20K
// Demonstrates ClockDomainCrossing primitive: a button signal from the fast
// clock domain is safely synchronised to the slow clock domain (derived by
// clock divider). LEDs toggle on the synchronised signal's rising edge.
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/dual-clock-sync \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/dual-clock-sync

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { ClockDomainCrossing } from '@ts2v/stdlib/cdc';

// Divide 27MHz by 256 to get ~105kHz slow domain
const CLK_DIV_BITS = 8;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class DualClockSync extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  btn: Bit = 0;
    @Output led: Logic<6> = 0x3F;

    private clk_div: Logic<8> = 0;
    private clk_slow: Bit = 0;
    private d_in: Bit = 0;
    private d_out: Bit = 0;
    private rst_n: Bit = 1;
    private prev_sync: Bit = 0;
    private led_state: Logic<6> = 0x3F;

    @Submodule cdc = new ClockDomainCrossing();

    @Sequential('clk')
    tickFast(): void {
        this.clk_div = this.clk_div + 1;
        if ((this.clk_div & ((1 << CLK_DIV_BITS) - 1)) === 0) {
            this.clk_slow = this.clk_slow ^ 1;
        }
        this.d_in = this.btn;
    }

    @Sequential('clk_slow')
    tickSlow(): void {
        this.prev_sync = this.d_out;
        if (this.d_out === 1 && this.prev_sync === 0) {
            this.led_state = this.led_state ^ 0x3F;
        }
        this.led = this.led_state;
    }
}

export { DualClockSync };
