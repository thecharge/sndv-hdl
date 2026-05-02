// AsyncFifo testbench spec - stdlib dual-clock async FIFO with gray-code pointers.
// Write domain: wr_clk / Read domain: rd_clk / Reset: rst_n (active-low).
// Default: DATA_WIDTH=8, DEPTH=16 (5-bit gray-code pointers with one extra MSB).

import type { SeqTestSpec } from '@ts2v/types';

export const cdcAsyncFifoSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'AsyncFifo',
    sourceFile: 'packages/stdlib/src/cdc/AsyncFifo.ts',
    clock: 'wr_clk',
    reset: 'rst_n',
    clockHalfPeriodNs: 18,
    clocks: [
        { name: 'rd_clk', halfPeriodNs: 23 },  // slightly different read clock
    ],
    checks: [
        // After reset: FIFO empty, not full, pointers at 0.
        {
            label: 'empty_after_reset',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { empty: "1'b1" },
        },
        {
            label: 'not_full_after_reset',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { full: "1'b0" },
        },
        {
            label: 'wr_ptr_zero_after_reset',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { wr_ptr: "5'd0" },
        },
        {
            label: 'rd_ptr_zero_after_reset',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { rd_ptr: "5'd0" },
        },
        // Write one entry: wr_ptr advances, FIFO no longer empty.
        {
            label: 'wr_ptr_increments_on_write',
            forcedSignals: { rst_n: "1'b1", wr_en: "1'b1", wr_data: "8'hAB", wr_ptr: "5'd0" },
            expectedSignals: { wr_ptr: "5'd1" },
        },
        // When wr_ptr != rd_ptr (wr_ptr=1, rd_ptr=0): not empty in read domain.
        // Force rd_gray_sync2 == wr_gray_sync2 (different) to show empty is 0.
        {
            label: 'not_empty_when_ptr_mismatch',
            forcedSignals: {
                rst_n: "1'b1",
                wr_ptr: "5'd3",
                rd_ptr: "5'd0",
                wr_gray: "5'd2",
                rd_gray: "5'd0",
                wr_gray_sync2: "5'd2",
                rd_gray_sync2: "5'd0",
            },
            expectedSignals: { full: "1'b0" },
        },
    ],
};
