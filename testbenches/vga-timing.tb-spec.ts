// VgaTimingGenerator testbench spec - stdlib 640x480@60Hz VGA timing.
// H timing: active=640, front=16, sync=96 (start=656, end=752), back=48, total=800
// V timing: active=480, front=10, sync=2  (start=490, end=492), back=33,  total=525
// Note: module uses resetSignal: "no_rst", initial values from field defaults.

import type { SeqTestSpec } from '@ts2v/types';

export const vgaTimingSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'VgaTimingGenerator',
    sourceFile: 'packages/stdlib/src/vga/VgaTimingGenerator.ts',
    clock: 'clk',
    clockHalfPeriodNs: 20,  // 25 MHz pixel clock
    checks: [
        // In the active area: h_cnt < 640 and v_cnt < 480 -> active = 1.
        {
            label: 'active_high_in_display_area',
            forcedSignals: { h_cnt: "10'd0", v_cnt: "10'd0" },
            expectedSignals: { active: "1'b1" },
        },
        {
            label: 'pixel_x_equals_h_cnt_in_active',
            forcedSignals: { h_cnt: "10'd100", v_cnt: "10'd50" },
            expectedSignals: { pixel_x: "10'd100" },
        },
        {
            label: 'pixel_y_equals_v_cnt_in_active',
            forcedSignals: { h_cnt: "10'd100", v_cnt: "10'd50" },
            expectedSignals: { pixel_y: "10'd50" },
        },
        // Outside active area: active = 0.
        {
            label: 'active_low_in_h_blanking',
            forcedSignals: { h_cnt: "10'd640", v_cnt: "10'd0" },
            expectedSignals: { active: "1'b0" },
        },
        {
            label: 'active_low_in_v_blanking',
            forcedSignals: { h_cnt: "10'd0", v_cnt: "10'd480" },
            expectedSignals: { active: "1'b0" },
        },
        // Horizontal sync: low from h_cnt=656 to 751, high otherwise.
        {
            label: 'hsync_low_in_h_sync_pulse',
            forcedSignals: { h_cnt: "10'd656", v_cnt: "10'd0" },
            expectedSignals: { hsync: "1'b0" },
        },
        {
            label: 'hsync_high_outside_h_sync',
            forcedSignals: { h_cnt: "10'd0", v_cnt: "10'd0" },
            expectedSignals: { hsync: "1'b1" },
        },
        // Vertical sync: low from v_cnt=490 to 491, high otherwise.
        {
            label: 'vsync_low_in_v_sync_pulse',
            forcedSignals: { h_cnt: "10'd0", v_cnt: "10'd490" },
            expectedSignals: { vsync: "1'b0" },
        },
        {
            label: 'vsync_high_outside_v_sync',
            forcedSignals: { h_cnt: "10'd0", v_cnt: "10'd0" },
            expectedSignals: { vsync: "1'b1" },
        },
        // h_cnt increments each clock, wraps at 799 -> 0.
        {
            label: 'h_cnt_increments',
            forcedSignals: { h_cnt: "10'd200", v_cnt: "10'd0" },
            expectedSignals: { h_cnt: "10'd201" },
        },
        {
            label: 'h_cnt_wraps_at_total',
            forcedSignals: { h_cnt: "10'd799", v_cnt: "10'd0" },
            expectedSignals: { h_cnt: "10'd0" },
        },
    ],
};
