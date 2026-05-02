// matrix-uart testbench spec.
// Two specs in this file:
//   1. matrixUartRxSpec (SeqTestSpec) - UART receiver state machine: reset, start-bit, data.
//   2. matrixEngineSpec (CombTestSpec) - 4x4 combinational multiply: zero, identity, non-trivial.

import type { CombTestSpec, SeqTestSpec } from '@ts2v/types';

// ---- 1. MatrixUartRx sequential spec ----
// State encoding (MxRxSt): MXR_IDLE=0, MXR_START=1, MXR_DATA=2, MXR_STOP=3
// BIT_PERIOD = 234 clocks at 27 MHz for 115200 baud.

export const matrixUartRxSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'MatrixUartRx',
    sourceFile: 'examples/hardware/tang_nano_20k/matrix_uart/hw/matrix_uart_rx.ts',
    clock: 'clk',
    clockHalfPeriodNs: 18,
    checks: [
        // Initial state: idle, rx_valid = 0.
        {
            label: 'initial_state_is_idle',
            forcedSignals: { state: "2'd0" },
            expectedSignals: { state: "2'd0" },
        },
        {
            label: 'rx_valid_low_when_idle',
            forcedSignals: { state: "2'd0", uart_rx: "1'b1" },
            expectedSignals: { rx_valid: "1'b0" },
        },
        // Falling edge on uart_rx while idle: transition to MXR_START.
        {
            label: 'start_bit_detected',
            forcedSignals: { state: "2'd0", uart_rx: "1'b0" },
            expectedSignals: { state: "2'd1" },
        },
        // In MXR_START, after half-period with rx still low: enter MXR_DATA.
        {
            label: 'half_period_valid_moves_to_data',
            forcedSignals: { state: "2'd1", uart_rx: "1'b0", baud_cnt: "8'd116" },
            expectedSignals: { state: "2'd2" },
        },
        // Glitch on start bit (rx high before half period): return to idle.
        {
            label: 'glitch_returns_to_idle',
            forcedSignals: { state: "2'd1", uart_rx: "1'b1", baud_cnt: "8'd116" },
            expectedSignals: { state: "2'd0" },
        },
        // After last data bit (bit_cnt=7, baud_cnt=233): move to stop.
        {
            label: 'last_data_bit_moves_to_stop',
            forcedSignals: { state: "2'd2", bit_cnt: "4'd7", baud_cnt: "8'd233", uart_rx: "1'b1" },
            expectedSignals: { state: "2'd3" },
        },
        // Stop bit complete: pulse rx_valid and return to idle.
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

// ---- 2. MatrixEngine combinational spec ----
// C[i][j] = sum_k( A[i][k] * B[k][j] )
// Inputs: a0..a15 (A row-major), b0..b15 (B row-major), all Logic<16>.
// Outputs: c0..c15 (C row-major), Logic<16>.
//
// Identity test: A = I_4, B = diag(7,8,9,10) -> C = diag(7,8,9,10).
//   a0=1,a5=1,a10=1,a15=1, others=0; b0=7,b5=8,b10=9,b15=10, others=0.
//   Expected: c0=7, c5=8, c10=9, c15=10, all off-diagonal = 0.
//
// Non-trivial: A = diag(1,2,3,4), B = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]].
//   c0=1, c1=2, c2=3, c3=4
//   c4=10, c5=12, c6=14, c7=16
//   c8=27, c9=30, c10=33, c11=36
//   c12=52, c13=56, c14=60, c15=64

const matrixPorts = {
    inputs: [
        'a0','a1','a2','a3','a4','a5','a6','a7',
        'a8','a9','a10','a11','a12','a13','a14','a15',
        'b0','b1','b2','b3','b4','b5','b6','b7',
        'b8','b9','b10','b11','b12','b13','b14','b15',
    ].map(name => ({ name, width: 16 })),
    outputs: [
        'c0','c1','c2','c3','c4','c5','c6','c7',
        'c8','c9','c10','c11','c12','c13','c14','c15',
    ].map(name => ({ name, width: 16 })),
};

const allZero16 = Object.fromEntries(
    [...Array(16).keys()].flatMap(i => [
        [`a${i}`, "16'd0"],
        [`b${i}`, "16'd0"],
    ])
);

export const matrixEngineSpec: CombTestSpec = {
    kind: 'combinational',
    module: 'MatrixEngine',
    sourceFile: 'examples/hardware/tang_nano_20k/matrix_uart/hw/matrix_engine.ts',
    ports: matrixPorts,
    vectors: [
        // Zero: all inputs = 0 -> all outputs = 0.
        {
            label: 'zero_times_zero',
            inputs: allZero16,
            expected: {
                c0: "16'd0", c1: "16'd0", c2: "16'd0", c3: "16'd0",
                c4: "16'd0", c5: "16'd0", c6: "16'd0", c7: "16'd0",
                c8: "16'd0", c9: "16'd0", c10: "16'd0", c11: "16'd0",
                c12: "16'd0", c13: "16'd0", c14: "16'd0", c15: "16'd0",
            },
        },
        // Identity A = I_4, B = diag(7,8,9,10) -> C = diag(7,8,9,10).
        {
            label: 'identity_times_diagonal',
            inputs: {
                ...allZero16,
                a0: "16'd1", a5: "16'd1", a10: "16'd1", a15: "16'd1",
                b0: "16'd7", b5: "16'd8", b10: "16'd9", b15: "16'd10",
            },
            expected: {
                c0: "16'd7",  c1: "16'd0",  c2: "16'd0",  c3: "16'd0",
                c4: "16'd0",  c5: "16'd8",  c6: "16'd0",  c7: "16'd0",
                c8: "16'd0",  c9: "16'd0",  c10: "16'd9", c11: "16'd0",
                c12: "16'd0", c13: "16'd0", c14: "16'd0", c15: "16'd10",
            },
        },
        // Non-trivial: A = diag(1,2,3,4), B = [[1..4],[5..8],[9..12],[13..16]].
        {
            label: 'diagonal_a_times_b',
            inputs: {
                ...allZero16,
                a0: "16'd1",  a5: "16'd2",  a10: "16'd3",  a15: "16'd4",
                b0: "16'd1",  b1: "16'd2",  b2: "16'd3",   b3: "16'd4",
                b4: "16'd5",  b5: "16'd6",  b6: "16'd7",   b7: "16'd8",
                b8: "16'd9",  b9: "16'd10", b10: "16'd11", b11: "16'd12",
                b12: "16'd13",b13: "16'd14",b14: "16'd15", b15: "16'd16",
            },
            expected: {
                c0: "16'd1",  c1: "16'd2",  c2: "16'd3",  c3: "16'd4",
                c4: "16'd10", c5: "16'd12", c6: "16'd14", c7: "16'd16",
                c8: "16'd27", c9: "16'd30", c10: "16'd33",c11: "16'd36",
                c12: "16'd52",c13: "16'd56",c14: "16'd60",c15: "16'd64",
            },
        },
    ],
};
