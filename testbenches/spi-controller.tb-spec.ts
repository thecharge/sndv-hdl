// SpiController testbench spec - stdlib SPI master (mode 0, CPOL=0 CPHA=0).
// State encoding: SPI_IDLE=0, SPI_ACTIVE=1, SPI_DONE=2
// SPI_CLK_DIV = 4 (27 MHz / 4 = 6.75 MHz)

import type { SeqTestSpec } from '@ts2v/types';

export const spiControllerSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'SpiController',
    sourceFile: 'packages/stdlib/src/spi/SpiController.ts',
    clock: 'clk',
    clockHalfPeriodNs: 18,
    checks: [
        // Idle state: ready, CS deasserted, SCLK low.
        {
            label: 'idle_state_is_zero',
            forcedSignals: { state: "2'd0" },
            expectedSignals: { state: "2'd0" },
        },
        {
            label: 'cs_n_high_when_idle',
            forcedSignals: { state: "2'd0", tx_valid: "1'b0" },
            expectedSignals: { cs_n: "1'b1" },
        },
        {
            label: 'sclk_low_when_idle',
            forcedSignals: { state: "2'd0", tx_valid: "1'b0" },
            expectedSignals: { sclk: "1'b0" },
        },
        {
            label: 'ready_high_when_idle',
            forcedSignals: { state: "2'd0", tx_valid: "1'b0" },
            expectedSignals: { ready: "1'b1" },
        },
        // Presenting tx_valid while idle starts a transfer.
        {
            label: 'tx_valid_captures_data',
            forcedSignals: { state: "2'd0", tx_valid: "1'b1", tx_data: "8'hC3" },
            expectedSignals: { shift_tx: "8'hC3" },
        },
        {
            label: 'tx_valid_moves_to_active',
            forcedSignals: { state: "2'd0", tx_valid: "1'b1", tx_data: "8'h42" },
            expectedSignals: { state: "2'd1" },
        },
        // rx_valid is a single-cycle pulse; in IDLE it is 0.
        {
            label: 'rx_valid_low_when_idle',
            forcedSignals: { state: "2'd0" },
            expectedSignals: { rx_valid: "1'b0" },
        },
    ],
};
