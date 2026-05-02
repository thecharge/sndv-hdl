// I2cController testbench spec - stdlib 100 kHz I2C master.
// State encoding: I2C_IDLE=0, I2C_START=1, I2C_ADDR=2, I2C_ADDR_ACK=3,
//                 I2C_DATA=4, I2C_DATA_ACK=5, I2C_STOP=6
// I2C_CLK_DIV = 270 (27 MHz / 100 kHz)

import type { SeqTestSpec } from '@ts2v/types';

export const i2cControllerSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'I2cController',
    sourceFile: 'packages/stdlib/src/i2c/I2cController.ts',
    clock: 'clk',
    clockHalfPeriodNs: 18,
    checks: [
        // Idle: SCL and SDA both high (open-drain lines idle high).
        {
            label: 'idle_state_is_zero',
            forcedSignals: { state: "4'd0" },
            expectedSignals: { state: "4'd0" },
        },
        {
            label: 'scl_high_when_idle',
            forcedSignals: { state: "4'd0", start: "1'b0" },
            expectedSignals: { scl: "1'b1" },
        },
        {
            label: 'sda_high_when_idle',
            forcedSignals: { state: "4'd0", start: "1'b0" },
            expectedSignals: { sda_out: "1'b1" },
        },
        {
            label: 'done_low_in_idle',
            forcedSignals: { state: "4'd0" },
            expectedSignals: { done: "1'b0" },
        },
        {
            label: 'ack_err_low_initially',
            forcedSignals: { state: "4'd0" },
            expectedSignals: { ack_err: "1'b0" },
        },
        // start=1 while idle transitions to I2C_START.
        {
            label: 'start_pulse_moves_to_start_state',
            forcedSignals: { state: "4'd0", start: "1'b1" },
            expectedSignals: { state: "4'd1" },
        },
        // In I2C_START, SDA is pulled low and SCL pulled low (START condition).
        {
            label: 'sda_low_after_start_state',
            forcedSignals: { state: "4'd1" },
            expectedSignals: { sda_out: "1'b0" },
        },
        {
            label: 'state_advances_to_addr_from_start',
            forcedSignals: { state: "4'd1" },
            expectedSignals: { state: "4'd2" },
        },
    ],
};
