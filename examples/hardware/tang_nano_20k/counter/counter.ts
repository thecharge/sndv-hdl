// counter.ts — Tang Nano 20K 8-bit free-running counter.
//
// The counter increments on every rising clock edge.  Active-low reset (S1)
// holds the counter at zero while pressed.
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/counter/counter.ts \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/counter

import { HardwareModule, Module, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class Counter extends HardwareModule {
    @Input clk: Bit = 0;   // 27 MHz system clock
    @Input rst_n: Bit = 1;   // active-low reset (S1): hold to reset
    @Output count: Logic<8> = 0;   // 8-bit counter value (wraps at 255)

    @Sequential('clk')
    tick(): void {
        this.count = this.count + 1;
    }
}

export { Counter };
