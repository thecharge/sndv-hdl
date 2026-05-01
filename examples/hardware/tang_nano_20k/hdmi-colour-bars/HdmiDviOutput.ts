import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// HDMI/DVI output - TMDS encoding for 24-bit RGB pixel data.
// Outputs 10-bit TMDS symbols per channel, ready for DDR serialisation.
//
// TMDS encoding (simplified, no DC balancing):
//   Active: XOR-chain 8 bits with transition minimisation, set q[8]=1
//   Blanking: emit 2-bit control token (hsync/vsync) as fixed 10-bit code
//
// For proper signal integrity, instantiate with a 5x pixel clock for serialisation.
// The 5x clock connects DDR output flip-flops in the synthesis tool constraint file.

const TMDS_CTRL_00 = 0x354;
const TMDS_CTRL_01 = 0x0AB;
const TMDS_CTRL_10 = 0x154;
const TMDS_CTRL_11 = 0x2AB;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class HdmiDviOutput extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  active: Bit = 0;
    @Input  hsync: Bit = 0;
    @Input  vsync: Bit = 0;
    @Input  red: Logic<8> = 0;
    @Input  green: Logic<8> = 0;
    @Input  blue: Logic<8> = 0;
    @Output tmds_red: Logic<10> = 0;
    @Output tmds_green: Logic<10> = 0;
    @Output tmds_blue: Logic<10> = 0;

    private r_d0: Bit = 0;
    private r_d1: Bit = 0;
    private r_d2: Bit = 0;
    private r_d3: Bit = 0;
    private r_d4: Bit = 0;
    private r_d5: Bit = 0;
    private r_d6: Bit = 0;
    private r_d7: Bit = 0;
    private g_d0: Bit = 0;
    private g_d1: Bit = 0;
    private g_d2: Bit = 0;
    private g_d3: Bit = 0;
    private g_d4: Bit = 0;
    private g_d5: Bit = 0;
    private g_d6: Bit = 0;
    private g_d7: Bit = 0;
    private b_d0: Bit = 0;
    private b_d1: Bit = 0;
    private b_d2: Bit = 0;
    private b_d3: Bit = 0;
    private b_d4: Bit = 0;
    private b_d5: Bit = 0;
    private b_d6: Bit = 0;
    private b_d7: Bit = 0;

    @Sequential('clk')
    tick(): void {
        if (this.active !== 0) {
            // XOR-chain encoding: minimise transitions
            this.r_d0 = (this.red >> 0) & 1;
            this.r_d1 = ((this.red >> 1) & 1) ^ this.r_d0;
            this.r_d2 = ((this.red >> 2) & 1) ^ this.r_d1;
            this.r_d3 = ((this.red >> 3) & 1) ^ this.r_d2;
            this.r_d4 = ((this.red >> 4) & 1) ^ this.r_d3;
            this.r_d5 = ((this.red >> 5) & 1) ^ this.r_d4;
            this.r_d6 = ((this.red >> 6) & 1) ^ this.r_d5;
            this.r_d7 = ((this.red >> 7) & 1) ^ this.r_d6;
            this.tmds_red = (1 << 8) |
                (this.r_d0) | (this.r_d1 << 1) | (this.r_d2 << 2) | (this.r_d3 << 3) |
                (this.r_d4 << 4) | (this.r_d5 << 5) | (this.r_d6 << 6) | (this.r_d7 << 7);

            this.g_d0 = (this.green >> 0) & 1;
            this.g_d1 = ((this.green >> 1) & 1) ^ this.g_d0;
            this.g_d2 = ((this.green >> 2) & 1) ^ this.g_d1;
            this.g_d3 = ((this.green >> 3) & 1) ^ this.g_d2;
            this.g_d4 = ((this.green >> 4) & 1) ^ this.g_d3;
            this.g_d5 = ((this.green >> 5) & 1) ^ this.g_d4;
            this.g_d6 = ((this.green >> 6) & 1) ^ this.g_d5;
            this.g_d7 = ((this.green >> 7) & 1) ^ this.g_d6;
            this.tmds_green = (1 << 8) |
                (this.g_d0) | (this.g_d1 << 1) | (this.g_d2 << 2) | (this.g_d3 << 3) |
                (this.g_d4 << 4) | (this.g_d5 << 5) | (this.g_d6 << 6) | (this.g_d7 << 7);

            this.b_d0 = (this.blue >> 0) & 1;
            this.b_d1 = ((this.blue >> 1) & 1) ^ this.b_d0;
            this.b_d2 = ((this.blue >> 2) & 1) ^ this.b_d1;
            this.b_d3 = ((this.blue >> 3) & 1) ^ this.b_d2;
            this.b_d4 = ((this.blue >> 4) & 1) ^ this.b_d3;
            this.b_d5 = ((this.blue >> 5) & 1) ^ this.b_d4;
            this.b_d6 = ((this.blue >> 6) & 1) ^ this.b_d5;
            this.b_d7 = ((this.blue >> 7) & 1) ^ this.b_d6;
            this.tmds_blue = (1 << 8) |
                (this.b_d0) | (this.b_d1 << 1) | (this.b_d2 << 2) | (this.b_d3 << 3) |
                (this.b_d4 << 4) | (this.b_d5 << 5) | (this.b_d6 << 6) | (this.b_d7 << 7);
        } else {
            this.tmds_red   = TMDS_CTRL_00;
            this.tmds_green = TMDS_CTRL_00;
            if (this.hsync !== 0 && this.vsync !== 0) {
                this.tmds_blue = TMDS_CTRL_11;
            }
            if (this.hsync !== 0 && this.vsync === 0) {
                this.tmds_blue = TMDS_CTRL_01;
            }
            if (this.hsync === 0 && this.vsync !== 0) {
                this.tmds_blue = TMDS_CTRL_10;
            }
            if (this.hsync === 0 && this.vsync === 0) {
                this.tmds_blue = TMDS_CTRL_00;
            }
        }
    }
}

export { HdmiDviOutput };
