import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// VGA 640x480 @ 60Hz timing generator
// Pixel clock: 25.175 MHz (approximated at 25 MHz)
// From a 27 MHz source, divide by 1 and accept slight frequency error,
// or use a 25 MHz pixel clock input directly.
//
// Horizontal (pixels at pixel clock):
//   Active:     640
//   Front porch:  16
//   Sync pulse:   96  (negative polarity)
//   Back porch:   48
//   Total:       800
//
// Vertical (lines):
//   Active:     480
//   Front porch:  10
//   Sync pulse:    2  (negative polarity)
//   Back porch:   33
//   Total:       525

const VGA_H_ACTIVE    = 640;
const VGA_H_TOTAL     = 800;
const VGA_V_ACTIVE    = 480;
const VGA_V_TOTAL     = 525;

const VGA_H_SYNC_START = 656;
const VGA_H_SYNC_END   = 752;
const VGA_V_SYNC_START = 490;
const VGA_V_SYNC_END   = 492;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class VgaTimingGenerator extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output hsync: Bit = 1;
    @Output vsync: Bit = 1;
    @Output active: Bit = 0;
    @Output pixel_x: Logic<10> = 0;
    @Output pixel_y: Logic<10> = 0;

    private h_cnt: Logic<10> = 0;
    private v_cnt: Logic<10> = 0;

    @Sequential('clk')
    tick(): void {
        if (this.h_cnt < VGA_H_TOTAL - 1) {
            this.h_cnt = this.h_cnt + 1;
        } else {
            this.h_cnt = 0;
            if (this.v_cnt < VGA_V_TOTAL - 1) {
                this.v_cnt = this.v_cnt + 1;
            } else {
                this.v_cnt = 0;
            }
        }

        if (this.h_cnt >= VGA_H_SYNC_START && this.h_cnt < VGA_H_SYNC_END) {
            this.hsync = 0;
        } else {
            this.hsync = 1;
        }

        if (this.v_cnt >= VGA_V_SYNC_START && this.v_cnt < VGA_V_SYNC_END) {
            this.vsync = 0;
        } else {
            this.vsync = 1;
        }

        if (this.h_cnt < VGA_H_ACTIVE && this.v_cnt < VGA_V_ACTIVE) {
            this.active = 1;
            this.pixel_x = this.h_cnt;
            this.pixel_y = this.v_cnt;
        } else {
            this.active = 0;
        }
    }
}

export { VgaTimingGenerator };
