// HdmiDviOutput testbench spec - stdlib TMDS-encoded DVI/HDMI output.
// During blanking (active=0): blue channel carries control codes based on hsync/vsync.
//   TMDS_CTRL_00 = 0x354, TMDS_CTRL_01 = 0x0AB, TMDS_CTRL_10 = 0x154, TMDS_CTRL_11 = 0x2AB
// During active pixels: channels carry TMDS-encoded 8-bit colour data.

import type { SeqTestSpec } from '@ts2v/types';

export const hdmiDviSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'HdmiDviOutput',
    sourceFile: 'packages/stdlib/src/hdmi/HdmiDviOutput.ts',
    clock: 'clk',
    clockHalfPeriodNs: 14,  // ~74.25 MHz pixel clock (1080p) or 25 MHz (720p)
    checks: [
        // Blanking, hsync=0, vsync=0: all channels emit CTRL_00 = 0x354.
        {
            label: 'blanking_ctrl00_blue',
            forcedSignals: { active: "1'b0", hsync: "1'b0", vsync: "1'b0" },
            expectedSignals: { tmds_blue: "10'h354" },
        },
        {
            label: 'blanking_ctrl00_red',
            forcedSignals: { active: "1'b0", hsync: "1'b0", vsync: "1'b0" },
            expectedSignals: { tmds_red: "10'h354" },
        },
        {
            label: 'blanking_ctrl00_green',
            forcedSignals: { active: "1'b0", hsync: "1'b0", vsync: "1'b0" },
            expectedSignals: { tmds_green: "10'h354" },
        },
        // Blanking, hsync=1, vsync=0: blue emits CTRL_01 = 0x0AB.
        {
            label: 'blanking_ctrl01_blue_when_hsync',
            forcedSignals: { active: "1'b0", hsync: "1'b1", vsync: "1'b0" },
            expectedSignals: { tmds_blue: "10'h0AB" },
        },
        // Blanking, hsync=0, vsync=1: blue emits CTRL_10 = 0x154.
        {
            label: 'blanking_ctrl10_blue_when_vsync',
            forcedSignals: { active: "1'b0", hsync: "1'b0", vsync: "1'b1" },
            expectedSignals: { tmds_blue: "10'h154" },
        },
        // Blanking, hsync=1, vsync=1: blue emits CTRL_11 = 0x2AB.
        {
            label: 'blanking_ctrl11_blue_when_both_sync',
            forcedSignals: { active: "1'b0", hsync: "1'b1", vsync: "1'b1" },
            expectedSignals: { tmds_blue: "10'h2AB" },
        },
    ],
};
