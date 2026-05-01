// hdmi_colour_bars.ts - HDMI colour bars test pattern for Tang Nano 20K
// Generates 640x480@60Hz VGA timing and drives standard colour bars via TMDS.
// Connects VgaTimingGenerator to HdmiDviOutput; outputs 10-bit TMDS symbols.
// Note: DDR serialisation (10:1 at 5x pixel clock) is not implemented here -
// this example demonstrates the encoding pipeline only.
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/hdmi-colour-bars \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/hdmi-colour-bars

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { VgaTimingGenerator } from './VgaTimingGenerator';
import { HdmiDviOutput } from './HdmiDviOutput';

// Eight-column colour bar widths (each 80 pixels of 640)
const BAR_WIDTH = 80;
const RED_VAL   = 0xFF;
const GRN_VAL   = 0xFF;
const BLU_VAL   = 0xFF;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class HdmiColourBars extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output tmds_red: Logic<10> = 0;
    @Output tmds_green: Logic<10> = 0;
    @Output tmds_blue: Logic<10> = 0;

    private hsync: Bit = 1;
    private vsync: Bit = 1;
    private active: Bit = 0;
    private pixel_x: Logic<10> = 0;
    private pixel_y: Logic<10> = 0;
    private red: Logic<8> = 0;
    private green: Logic<8> = 0;
    private blue: Logic<8> = 0;

    @Submodule vga = new VgaTimingGenerator();
    @Submodule hdmi = new HdmiDviOutput();

    @Sequential('clk')
    tick(): void {
        this.red   = 0;
        this.green = 0;
        this.blue  = 0;
        if (this.active !== 0) {
            if (this.pixel_x < BAR_WIDTH) {
                this.red = RED_VAL; this.green = GRN_VAL; this.blue = BLU_VAL;
            }
            if (this.pixel_x >= BAR_WIDTH && this.pixel_x < BAR_WIDTH * 2) {
                this.red = RED_VAL; this.green = GRN_VAL;
            }
            if (this.pixel_x >= BAR_WIDTH * 2 && this.pixel_x < BAR_WIDTH * 3) {
                this.green = GRN_VAL; this.blue = BLU_VAL;
            }
            if (this.pixel_x >= BAR_WIDTH * 3 && this.pixel_x < BAR_WIDTH * 4) {
                this.green = GRN_VAL;
            }
            if (this.pixel_x >= BAR_WIDTH * 4 && this.pixel_x < BAR_WIDTH * 5) {
                this.red = RED_VAL; this.blue = BLU_VAL;
            }
            if (this.pixel_x >= BAR_WIDTH * 5 && this.pixel_x < BAR_WIDTH * 6) {
                this.red = RED_VAL;
            }
            if (this.pixel_x >= BAR_WIDTH * 6 && this.pixel_x < BAR_WIDTH * 7) {
                this.blue = BLU_VAL;
            }
        }
    }
}

export { HdmiColourBars };
