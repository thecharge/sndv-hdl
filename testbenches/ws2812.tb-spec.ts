// Ws2812Serialiser testbench spec - stdlib WS2812B/C protocol serialiser.
// phase: 0=RESET (output low, timer counts to 9999), 1=BITS (sending 24 bits)
// WS_T0H_CLOCKS = 9, WS_T1H_CLOCKS = 19, WS_TBIT_LAST = 29, WS_TRESET_LAST = 9999

import type { SeqTestSpec } from '@ts2v/types';

export const ws2812Spec: SeqTestSpec = {
    kind: 'sequential',
    module: 'Ws2812Serialiser',
    sourceFile: 'packages/stdlib/src/ws2812/Ws2812Serialiser.ts',
    clock: 'clk',
    clockHalfPeriodNs: 18,
    checks: [
        // Reset phase: ws2812 output must be low, timer counts up.
        {
            label: 'ws2812_low_during_reset_phase',
            forcedSignals: { phase: "1'b0", timer: "14'd0" },
            expectedSignals: { ws2812: "1'b0" },
        },
        {
            label: 'timer_increments_in_reset_phase',
            forcedSignals: { phase: "1'b0", timer: "14'd100" },
            expectedSignals: { timer: "14'd101" },
        },
        // When timer reaches WS_TRESET_LAST (9999) in reset phase, load frame and enter BITS.
        {
            label: 'reset_complete_enters_bits_phase',
            forcedSignals: { phase: "1'b0", timer: "14'd9999", frame: "24'hABCDEF" },
            expectedSignals: { phase: "1'b1" },
        },
        {
            label: 'reset_complete_loads_frame_into_shift',
            forcedSignals: { phase: "1'b0", timer: "14'd9999", frame: "24'h123456" },
            expectedSignals: { shiftReg: "24'h123456" },
        },
        // In BITS phase, first T0H clocks output is high (ws2812 = 1 for timer < 9).
        {
            label: 'bits_phase_output_high_during_t0h',
            forcedSignals: { phase: "1'b1", timer: "14'd0", shiftReg: "24'd0", bitCnt: "5'd0" },
            expectedSignals: { ws2812: "1'b1" },
        },
        // When bitCnt reaches WS_BITS_LAST (23) and timer=29: reset phase returns.
        {
            label: 'last_bit_returns_to_reset_phase',
            forcedSignals: { phase: "1'b1", timer: "14'd29", bitCnt: "5'd23" },
            expectedSignals: { phase: "1'b0" },
        },
    ],
};
