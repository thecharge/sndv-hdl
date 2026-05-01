// TypeScript testbench spec for the tpu_uart example.
// Source: examples/hardware/tang_nano_20k/tpu_uart/hw/
//
// Tests TpuEngine state machine behaviour by forcing register state and
// verifying outputs after one clock cycle.
//
// State encoding (TpuEngSt):
//   0=TE_WAIT_OP  1-4=TE_WAIT_A0..A3  5-8=TE_WAIT_B0..B3
//   9=TE_COMPUTE  10=TE_SEND_HI  11=TE_HOLD  12=TE_SEND_LO
//
// Op encoding: 0=dot  1=mac  2=relu  3=reset_acc

import type { SeqTestSpec } from '@ts2v/types';

export const tpuEngineSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'TpuEngine',
    sourceFile: 'examples/hardware/tang_nano_20k/tpu_uart/hw',
    clock: 'clk',
    clockHalfPeriodNs: 18,
    checks: [
        // --- Reset / idle ---
        // In TE_WAIT_OP with rx_valid=0: stay in TE_WAIT_OP (state 0).
        {
            label: 'wait_op_no_valid_stays_idle',
            forcedSignals: { teSt: "4'd0", rx_valid: "1'b0" },
            expectedSignals: { teSt: "4'd0" },
        },
        // In TE_WAIT_OP with rx_valid=1 and op=0 (dot): advance to TE_WAIT_A0 (state 1).
        {
            label: 'wait_op_dot_advances_to_wait_a0',
            forcedSignals: { teSt: "4'd0", rx_valid: "1'b1", rx_data: "8'h00" },
            expectedSignals: { teSt: "4'd1" },
        },
        // In TE_WAIT_OP with rx_valid=1 and op=2 (relu): skip to TE_COMPUTE (state 9).
        {
            label: 'wait_op_relu_skips_to_compute',
            forcedSignals: { teSt: "4'd0", rx_valid: "1'b1", rx_data: "8'h02" },
            expectedSignals: { teSt: "4'd9" },
        },

        // --- Dot product ---
        // Force TE_COMPUTE with op=0, a=[1,2,3,4], b=[4,3,2,1].
        // dot = 1*4 + 2*3 + 3*2 + 4*1 = 4+6+6+4 = 20.
        {
            label: 'dot_compute_1234_dot_4321_equals_20',
            forcedSignals: {
                teSt: "4'd9",
                teOp:  "2'd0",
                teA0:  "8'd1", teA1: "8'd2", teA2: "8'd3", teA3: "8'd4",
                teB0:  "8'd4", teB1: "8'd3", teB2: "8'd2", teB3: "8'd1",
            },
            expectedSignals: { teResult: "16'd20" },
        },
        // Dot product: identity check — a=[1,0,0,0] b=[7,0,0,0] = 7.
        {
            label: 'dot_single_element_product_7',
            forcedSignals: {
                teSt: "4'd9",
                teOp:  "2'd0",
                teA0: "8'd1", teA1: "8'd0", teA2: "8'd0", teA3: "8'd0",
                teB0: "8'd7", teB1: "8'd0", teB2: "8'd0", teB3: "8'd0",
            },
            expectedSignals: { teResult: "16'd7" },
        },
        // Dot product does not change accumulator.
        {
            label: 'dot_does_not_update_accumulator',
            forcedSignals: {
                teSt: "4'd9",
                teOp:  "2'd0",
                teAcc: "16'd42",
                teA0: "8'd1", teA1: "8'd0", teA2: "8'd0", teA3: "8'd0",
                teB0: "8'd5", teB1: "8'd0", teB2: "8'd0", teB3: "8'd0",
            },
            expectedSignals: { teAcc: "16'd42" },
        },

        // --- MAC accumulation ---
        // Force TE_COMPUTE with op=1, acc=10, a=[5,0,0,0], b=[1,0,0,0].
        // mac: acc = 10 + 5*1 = 15; result = 15.
        {
            label: 'mac_accumulates_dot_into_acc',
            forcedSignals: {
                teSt: "4'd9",
                teOp:  "2'd1",
                teAcc: "16'd10",
                teA0: "8'd5", teA1: "8'd0", teA2: "8'd0", teA3: "8'd0",
                teB0: "8'd1", teB1: "8'd0", teB2: "8'd0", teB3: "8'd0",
            },
            expectedSignals: { teResult: "16'd15" },
        },

        // --- ReLU ---
        // relu with positive accumulator (acc=42 < 0x8000): result = 42.
        {
            label: 'relu_positive_acc_passes_through',
            forcedSignals: { teSt: "4'd9", teOp: "2'd2", teAcc: "16'd42" },
            expectedSignals: { teResult: "16'd42" },
        },
        // relu with "negative" accumulator (acc=0x8001 >= 0x8000): result = 0.
        {
            label: 'relu_negative_acc_clamps_to_zero',
            forcedSignals: { teSt: "4'd9", teOp: "2'd2", teAcc: "16'h8001" },
            expectedSignals: { teResult: "16'd0" },
        },

        // --- Reset accumulator ---
        // reset_acc: teAcc = 0, teResult = 0.
        {
            label: 'reset_acc_clears_accumulator',
            forcedSignals: { teSt: "4'd9", teOp: "2'd3", teAcc: "16'd999" },
            expectedSignals: { teAcc: "16'd0", teResult: "16'd0" },
        },

        // --- TX send path ---
        // In TE_SEND_HI with tx_ready=1: assert tx_valid and send high byte.
        // teResult=0x0014 (20): high byte = 0x00.
        {
            label: 'send_hi_asserts_tx_valid_when_ready',
            forcedSignals: { teSt: "4'd10", tx_ready: "1'b1", teResult: "16'h0014" },
            expectedSignals: { tx_valid: "1'b1", tx_data: "8'h00" },
        },
        // In TE_SEND_LO with tx_ready=1: send low byte of result.
        // teResult=0x0014 (20): low byte = 0x14 = 20.
        {
            label: 'send_lo_transmits_result_low_byte',
            forcedSignals: { teSt: "4'd12", tx_ready: "1'b1", teResult: "16'h0014" },
            expectedSignals: { tx_valid: "1'b1", tx_data: "8'h14" },
        },
    ],
};
