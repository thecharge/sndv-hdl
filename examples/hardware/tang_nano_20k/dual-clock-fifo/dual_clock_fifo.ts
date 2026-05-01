// dual_clock_fifo.ts - Async FIFO CDC example for Tang Nano 20K
// Writes bytes from fast clock domain into an async FIFO;
// reads them out in a slow clock domain and displays on LEDs.
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/dual-clock-fifo \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/dual-clock-fifo

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { AsyncFifo } from './AsyncFifo';

const CLK_DIV_BITS = 9;
const WRITE_PERIOD = 0xFFFF;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class DualClockFifo extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output led: Logic<6> = 0x3F;

    private clk_div: Logic<9> = 0;
    private clk_slow: Bit = 0;
    private rst_n: Bit = 1;
    private wr_en: Bit = 0;
    private wr_data: Logic<8> = 0;
    private wr_full: Bit = 0;
    private rd_en: Bit = 0;
    private rd_data: Logic<8> = 0;
    private rd_empty: Bit = 0;
    private write_timer: Logic<16> = 0;
    private byte_val: Logic<8> = 0;

    @Submodule fifo = new AsyncFifo();

    @Sequential('clk')
    tickFast(): void {
        this.clk_div = this.clk_div + 1;
        if ((this.clk_div & ((1 << CLK_DIV_BITS) - 1)) === 0) {
            this.clk_slow = this.clk_slow ^ 1;
        }
        this.wr_en = 0;
        this.write_timer = this.write_timer + 1;
        if (this.write_timer === WRITE_PERIOD) {
            if (this.wr_full === 0) {
                this.wr_data = this.byte_val;
                this.wr_en = 1;
                this.byte_val = this.byte_val + 1;
            }
        }
    }

    @Sequential('clk_slow')
    tickSlow(): void {
        this.rd_en = 0;
        if (this.rd_empty === 0) {
            this.rd_en = 1;
            this.led = ~this.rd_data & 0x3F;
        }
    }
}

export { DualClockFifo };
