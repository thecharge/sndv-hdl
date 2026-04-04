// bus_splitter.ts — Bit-slice intrinsic demo for Tang Nano 20K.
//
// BusSplitter receives a 16-bit input bus and uses Bits.slice to split it
// into four named 4-bit sub-fields in a @Combinational method.
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/bus_splitter/bus_splitter.ts \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/bus_splitter

import { HardwareModule, Module, Input, Output, Combinational } from '@ts2v/runtime';
import { Bits } from '@ts2v/runtime';
import type { Logic } from '@ts2v/runtime';

@Module
class BusSplitter extends HardwareModule {
    @Input  bus:    Logic<16> = 0;
    @Output field3: Logic<4>  = 0;
    @Output field2: Logic<4>  = 0;
    @Output field1: Logic<4>  = 0;
    @Output field0: Logic<4>  = 0;

    @Combinational
    split(): void {
        this.field3 = Bits.slice(this.bus, 15, 12);
        this.field2 = Bits.slice(this.bus, 11, 8);
        this.field1 = Bits.slice(this.bus, 7, 4);
        this.field0 = Bits.slice(this.bus, 3, 0);
    }
}

export { BusSplitter };
