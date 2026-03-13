// TypeScript testbench spec for the blinker (sequential) example.
// Source: examples/blinker/blinker.ts
// Tests: software-model blinker using direct register forcing

import type { SeqTestSpec } from './tb-spec-types';

export const blinkerSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'blinker',
    sourceFile: 'examples/blinker/blinker.ts',
    clock: 'clk',
    clockHalfPeriodNs: 5,
    checks: [
        {
            label: 'counter_zero_led_all_off',
            forcedSignals: { counter: "32'd0" },
            expectedSignals: { led: "6'h3f" },
        },
    ],
};
