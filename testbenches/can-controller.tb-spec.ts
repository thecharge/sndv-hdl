// CanController testbench spec - stdlib CAN 2.0A standard-frame transmitter/receiver.
// State: CAN_IDLE=0, CAN_SOF=1, CAN_ID=2, CAN_CTRL=3, CAN_DATA=4,
//         CAN_CRC=5, CAN_CRC_DEL=6, CAN_ACK=7, CAN_EOF=8, CAN_IFS=9

import type { SeqTestSpec } from '@ts2v/types';

export const canControllerSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'CanController',
    sourceFile: 'packages/stdlib/src/can/CanController.ts',
    clock: 'clk',
    clockHalfPeriodNs: 18,
    checks: [
        // Idle: ready to transmit, CAN bus line recessive (high).
        {
            label: 'idle_state_is_zero',
            forcedSignals: { state: "4'd0" },
            expectedSignals: { state: "4'd0" },
        },
        {
            label: 'can_tx_high_when_idle',
            forcedSignals: { state: "4'd0", tx_valid: "1'b0" },
            expectedSignals: { can_tx: "1'b1" },
        },
        {
            label: 'tx_ready_when_idle',
            forcedSignals: { state: "4'd0", tx_valid: "1'b0" },
            expectedSignals: { tx_ready: "1'b1" },
        },
        {
            label: 'rx_valid_low_in_idle',
            forcedSignals: { state: "4'd0" },
            expectedSignals: { rx_valid: "1'b0" },
        },
        {
            label: 'ack_err_low_in_idle',
            forcedSignals: { state: "4'd0" },
            expectedSignals: { ack_err: "1'b0" },
        },
        // tx_valid with dominant bus (can_rx=0 = dominant) starts a frame: CAN_SOF.
        {
            label: 'tx_valid_on_dominant_bus_moves_to_sof',
            forcedSignals: { state: "4'd0", tx_valid: "1'b1", can_rx: "1'b0" },
            expectedSignals: { state: "4'd1" },
        },
        // In CAN_SOF, state advances to CAN_ID (=2) in one clock.
        {
            label: 'sof_advances_to_can_id',
            forcedSignals: { state: "4'd1" },
            expectedSignals: { state: "4'd2" },
        },
    ],
};
