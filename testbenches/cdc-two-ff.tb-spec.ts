// ClockDomainCrossing testbench spec - stdlib two-FF synchroniser.
// Two flip-flops in series: meta (FF1) and d_out (FF2).
// Signal propagates: d_in -> meta (1 cycle) -> d_out (2 cycles).

import type { SeqTestSpec } from '@ts2v/types';

export const cdcTwoFfSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'ClockDomainCrossing',
    sourceFile: 'packages/stdlib/src/cdc/ClockDomainCrossing.ts',
    clock: 'clk_dst',
    reset: 'rst_n',
    clockHalfPeriodNs: 18,
    checks: [
        // Under reset: meta and d_out are both 0.
        {
            label: 'reset_clears_meta',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { meta: "1'b0" },
        },
        {
            label: 'reset_clears_d_out',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { d_out: "1'b0" },
        },
        // After reset, d_in=1: meta becomes 1 after 1 cycle.
        {
            label: 'meta_captures_d_in_high',
            forcedSignals: { rst_n: "1'b1", d_in: "1'b1", meta: "1'b0" },
            expectedSignals: { meta: "1'b1" },
        },
        // d_out follows meta with one more cycle.
        {
            label: 'd_out_follows_meta',
            forcedSignals: { rst_n: "1'b1", d_in: "1'b1", meta: "1'b1" },
            expectedSignals: { d_out: "1'b1" },
        },
        // When d_in drops to 0: meta clears.
        {
            label: 'meta_clears_when_d_in_low',
            forcedSignals: { rst_n: "1'b1", d_in: "1'b0", meta: "1'b1" },
            expectedSignals: { meta: "1'b0" },
        },
    ],
};
