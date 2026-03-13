// TypeScript testbench spec for the nibble4 4-bit soft-CPU SoC.
// Source: examples/cpu/nibble4/nibble4_soc.ts
//
// The nibble4 is a 4-bit data path, 8-bit instruction CPU.
// Tests verify reset behaviour and basic FETCH/DECODE/EXEC phase transitions.

import type { SeqTestSpec } from '../../testbenches/tb-spec-types';

export const nibble4SocSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'Nibble4Soc',
    sourceFile: 'examples/cpu/nibble4/nibble4_soc.ts',
    clock: 'clk',
    reset: 'rst_n',
    clockHalfPeriodNs: 18,
    checks: [
        {
            label: 'reset_pc_zero',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { pc: "8'h00" },
        },
        {
            label: 'reset_uart_idle',
            forcedSignals: { rst_n: "1'b0" },
            expectedSignals: { uart_tx: "1'b1" },
        },
    ],
};
