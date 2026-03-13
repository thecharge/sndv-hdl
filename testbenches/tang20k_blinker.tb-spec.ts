// TypeScript testbench spec for the Tang Nano 20K blinker hardware example.
// Source: examples/hardware/tang_nano_20k/blinker/blinker.ts
//
// The blinker has no reset — registers initialise to 0 on FPGA power-up.
// Tests verify the active-low LED pattern emitted for each phase value.

import type { SeqTestSpec } from './tb-spec-types';

export const tang20kBlinkerSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'Blinker',
    sourceFile: 'examples/hardware/tang_nano_20k/blinker/blinker.ts',
    clock: 'clk',
    clockHalfPeriodNs: 18, // ~27 MHz
    checks: [
        {
            label: 'phase0_led0_on',
            forcedSignals: { phase: "3'd0", counter: "25'd0" },
            expectedSignals: { led: "6'h3e" },
        },
        {
            label: 'phase1_led1_on',
            forcedSignals: { phase: "3'd1", counter: "25'd0" },
            expectedSignals: { led: "6'h3d" },
        },
        {
            label: 'phase2_led2_on',
            forcedSignals: { phase: "3'd2", counter: "25'd0" },
            expectedSignals: { led: "6'h3b" },
        },
        {
            label: 'phase3_led3_on',
            forcedSignals: { phase: "3'd3", counter: "25'd0" },
            expectedSignals: { led: "6'h37" },
        },
        {
            label: 'phase4_led4_on',
            forcedSignals: { phase: "3'd4", counter: "25'd0" },
            expectedSignals: { led: "6'h2f" },
        },
        {
            label: 'phase5_led5_on',
            forcedSignals: { phase: "3'd5", counter: "25'd0" },
            expectedSignals: { led: "6'h1f" },
        },
    ],
};
