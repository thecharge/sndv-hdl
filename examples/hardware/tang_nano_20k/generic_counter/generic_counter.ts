// generic_counter.ts — Parameterised counter demo for Tang Nano 20K.
//
// Counter is a generic 8-bit counter that wraps at MAX_COUNT.
// GenericCounter instantiates two Counter submodules with different
// MAX_COUNT values to demonstrate parameterised module instantiation.
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/generic_counter/generic_counter.ts \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/generic_counter

import { HardwareModule, Module, Input, Output, Sequential, Submodule, Param } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// Generic counter that wraps at MAX_COUNT.
@Module
class Counter extends HardwareModule {
    @Param MAX_COUNT: Logic<8> = 255;   // wrap threshold (default: 255)

    @Input clk: Bit = 0;               // 27 MHz system clock
    @Output count: Logic<8> = 0;       // current count value

    @Sequential('clk')
    tick(): void {
        if (this.count === this.MAX_COUNT) {
            this.count = 0;
        } else {
            this.count = this.count + 1;
        }
    }
}

// Top-level module: two Counter instances with different MAX_COUNT values.
@Module
class GenericCounter extends HardwareModule {
    @Input clk: Bit = 0;        // 27 MHz system clock
    @Output count_a: Logic<8> = 0;   // counter A output (wraps at 127)
    @Output count_b: Logic<8> = 0;   // counter B output (wraps at 63)

    // Counter A: wraps at 127; Counter B: wraps at 63.
    @Submodule('MAX_COUNT=127, clk: clk, count: count_a') counter_a = new Counter();
    @Submodule('MAX_COUNT=63, clk: clk, count: count_b') counter_b = new Counter();
}

export { Counter, GenericCounter };
