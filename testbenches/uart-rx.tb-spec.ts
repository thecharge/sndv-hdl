// UartRx testbench spec - stdlib 115200 8N1 UART receiver.
// State encoding: RX_IDLE=0, RX_START=1, RX_DATA=2, RX_STOP=3
// RX_HALF_PERIOD = 117 clocks (mid-bit sampling)

import type { SeqTestSpec } from '@ts2v/types';

export const uartRxSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'UartRx',
    sourceFile: 'packages/stdlib/src/uart/UartRx.ts',
    clock: 'clk',
    clockHalfPeriodNs: 18,
    checks: [
        // Initial state: idle, no valid output.
        {
            label: 'idle_state_is_zero',
            forcedSignals: { state: "2'd0" },
            expectedSignals: { state: "2'd0" },
        },
        {
            label: 'rx_valid_low_when_idle',
            forcedSignals: { state: "2'd0", rx: "1'b1" },
            expectedSignals: { rx_valid: "1'b0" },
        },
        // Start bit (rx goes low while in IDLE) triggers transition to RX_START.
        {
            label: 'start_bit_detected_moves_to_rx_start',
            forcedSignals: { state: "2'd0", rx: "1'b0" },
            expectedSignals: { state: "2'd1" },
        },
        // In RX_START with baud_cnt reaching half period and rx still low: move to RX_DATA.
        {
            label: 'half_period_valid_start_moves_to_data',
            forcedSignals: { state: "2'd1", rx: "1'b0", baud_cnt: "8'd116" },
            expectedSignals: { state: "2'd2" },
        },
        // In RX_START with rx high (glitch): return to IDLE.
        {
            label: 'glitch_returns_to_idle',
            forcedSignals: { state: "2'd1", rx: "1'b1", baud_cnt: "8'd116" },
            expectedSignals: { state: "2'd0" },
        },
        // In RX_DATA, bit_cnt=7, baud_cnt reaches period-1: move to STOP.
        {
            label: 'last_data_bit_moves_to_stop',
            forcedSignals: { state: "2'd2", bit_cnt: "4'd7", baud_cnt: "8'd233", rx: "1'b1" },
            expectedSignals: { state: "2'd3" },
        },
        // In RX_STOP, when baud_cnt reaches period-1: pulse rx_valid and return to IDLE.
        {
            label: 'stop_pulses_rx_valid',
            forcedSignals: { state: "2'd3", baud_cnt: "8'd233" },
            expectedSignals: { rx_valid: "1'b1" },
        },
        {
            label: 'stop_returns_to_idle',
            forcedSignals: { state: "2'd3", baud_cnt: "8'd233" },
            expectedSignals: { state: "2'd0" },
        },
    ],
};
