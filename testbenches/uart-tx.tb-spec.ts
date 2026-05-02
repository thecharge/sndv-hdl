// UartTx testbench spec - stdlib 115200 8N1 UART transmitter.
// State encoding: TX_IDLE=0, TX_START=1, TX_DATA=2, TX_STOP=3

import type { SeqTestSpec } from '@ts2v/types';

export const uartTxSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'UartTx',
    sourceFile: 'packages/stdlib/src/uart/UartTx.ts',
    clock: 'clk',
    clockHalfPeriodNs: 18,
    checks: [
        // Initial state: idle, tx line high, ready.
        {
            label: 'idle_state_is_zero',
            forcedSignals: { state: "2'd0" },
            expectedSignals: { state: "2'd0" },
        },
        {
            label: 'tx_high_when_idle',
            forcedSignals: { state: "2'd0", tx_valid: "1'b0" },
            expectedSignals: { tx: "1'b1" },
        },
        {
            label: 'tx_ready_when_idle',
            forcedSignals: { state: "2'd0", tx_valid: "1'b0" },
            expectedSignals: { tx_ready: "1'b1" },
        },
        // Presenting tx_valid=1 in IDLE latches tx_data and moves to TX_START.
        {
            label: 'tx_valid_latches_data_and_enters_start',
            forcedSignals: { state: "2'd0", tx_valid: "1'b1", tx_data: "8'hA5" },
            expectedSignals: { shift: "8'hA5" },
        },
        {
            label: 'tx_valid_moves_to_start_state',
            forcedSignals: { state: "2'd0", tx_valid: "1'b1", tx_data: "8'h55" },
            expectedSignals: { state: "2'd1" },
        },
        // In TX_START state the tx output must be 0 (start bit).
        {
            label: 'start_bit_drives_tx_low',
            forcedSignals: { state: "2'd1", baud_cnt: "8'd0" },
            expectedSignals: { tx: "1'b0" },
        },
        // When baud_cnt reaches UART_BIT_PERIOD-1 (233) in TX_STOP, return to IDLE.
        {
            label: 'stop_complete_returns_to_idle',
            forcedSignals: { state: "2'd3", baud_cnt: "8'd233" },
            expectedSignals: { state: "2'd0" },
        },
        {
            label: 'tx_ready_after_stop',
            forcedSignals: { state: "2'd3", baud_cnt: "8'd233" },
            expectedSignals: { tx_ready: "1'b1" },
        },
    ],
};
