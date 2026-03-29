// aurora_gen_uart.ts - 8-pixel aurora wave colour generator with UART command control.
//
// Extends the smooth-HSV aurora generator with real-time control via UART.
// Receives parsed bytes from AuroraUartRx (rx_data + rx_valid) and changes the
// animation mode or speed accordingly.  Sends a single ACK byte via tx_data + tx_valid.
//
// UART commands (single ASCII byte):
//   'a' (97)  - aurora mode: full-spectrum rainbow wave (default)
//   'r' (114) - red: all 8 pixels solid red
//   'g' (103) - green: all 8 pixels solid green
//   'b' (98)  - blue: all 8 pixels solid blue
//   'f' (102) - faster: 8× speed (same as holding S2 button)
//   's' (115) - slower: back to normal 1× speed
//   'x' (120) - freeze: stop animation, hold current colours
//   Any other byte: ignored (no ACK)
//
// ACK: sends ASCII 'K' (75) one clock after any recognised command.
//
// Colour model: piecewise-linear HSV in GRB byte order (same as aurora_wave).
// Solid colour GRB constants (full brightness, ~99%):
//   RED   = 0x00FC00  (G=0, R=252, B=0)
//   GREEN = 0xFC0000  (G=252, R=0, B=0)
//   BLUE  = 0x0000FC  (G=0, R=0, B=252)
//
// Animation timing at 27 MHz:
//   Normal (1×): ~9.9 s per revolution.   Fast (8×): ~1.2 s per revolution.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// Animation modes.
enum AnimMode { AURORA = 0, RED = 1, GREEN = 2, BLUE = 3, FREEZE = 4 }

// UART command bytes (ASCII).
const CMD_AURORA = 97;   // 'a'
const CMD_RED    = 114;  // 'r'
const CMD_GREEN  = 103;  // 'g'
const CMD_BLUE   = 98;   // 'b'
const CMD_FASTER = 102;  // 'f'
const CMD_SLOWER = 115;  // 's'
const CMD_FREEZE = 120;  // 'x'
const ACK_BYTE   = 75;   // 'K'

// Solid-colour GRB values (G=bits[23:16], R=bits[15:8], B=bits[7:0]).
const GRB_RED   = 0x00FC00;
const GRB_GREEN = 0xFC0000;
const GRB_BLUE  = 0x0000FC;

// Piecewise-linear HSV parameters (hue 0..255, 3 segments of 85 steps).
const H_SEG     = 85;
const H_2SEG    = 170;
const H_SEG_M1  = 84;
const H_2SEG_M1 = 169;
const H_3SEG_M1 = 254;
const H_MULT    = 3;
const HUE_STEP  = 32;   // 1/8 of 256-step wheel

// Phase increments.
const PHASE_FAST   = 8;
const PHASE_NORMAL = 1;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class AuroraGenUart extends HardwareModule {
    @Input  clk:      Bit       = 0;
    @Input  btn:      Bit       = 0;       // S2: hold for fast mode (hardware override)
    @Input  rx_data:  Logic<8>  = 0;       // from AuroraUartRx
    @Input  rx_valid: Bit       = 0;       // 1-clock pulse when rx_data valid
    @Output pixel0:   Logic<24> = 0;
    @Output pixel1:   Logic<24> = 0;
    @Output pixel2:   Logic<24> = 0;
    @Output pixel3:   Logic<24> = 0;
    @Output pixel4:   Logic<24> = 0;
    @Output pixel5:   Logic<24> = 0;
    @Output pixel6:   Logic<24> = 0;
    @Output pixel7:   Logic<24> = 0;
    @Output tx_data:  Logic<8>  = 0;       // to AuroraUartTx
    @Output tx_valid: Bit       = 0;       // 1-clock pulse to send tx_data

    private phase:     Logic<28> = 0;
    private mode:      AnimMode  = AnimMode.AURORA;
    private solidGrb:  Logic<24> = GRB_RED;  // colour used for solid modes
    private uartFast:  Bit       = 0;          // set by 'f' cmd, cleared by 's' cmd

    private hue0: Logic<8> = 0;
    private hue1: Logic<8> = 0;
    private hue2: Logic<8> = 0;
    private hue3: Logic<8> = 0;
    private hue4: Logic<8> = 0;
    private hue5: Logic<8> = 0;
    private hue6: Logic<8> = 0;
    private hue7: Logic<8> = 0;

    @Sequential('clk')
    tick(): void {
        this.tx_valid = 0;  // default: no TX this clock

        // Process incoming UART command (if any).
        if (this.rx_valid === 1) {
            this.processCmd();
        }

        // Aurora mode: advance phase and compute smooth HSV colours.
        if (this.mode === AnimMode.AURORA) {
            if (this.btn === 1) {
                this.phase = this.phase + PHASE_FAST;
            } else if (this.uartFast === 1) {
                this.phase = this.phase + PHASE_FAST;
            } else {
                this.phase = this.phase + PHASE_NORMAL;
            }

            this.hue0 = (this.phase >> 20) & 0xFF;
            this.hue1 = ((this.phase >> 20) + HUE_STEP) & 0xFF;
            this.hue2 = ((this.phase >> 20) + 64) & 0xFF;
            this.hue3 = ((this.phase >> 20) + 96) & 0xFF;
            this.hue4 = ((this.phase >> 20) + 128) & 0xFF;
            this.hue5 = ((this.phase >> 20) + 160) & 0xFF;
            this.hue6 = ((this.phase >> 20) + 192) & 0xFF;
            this.hue7 = ((this.phase >> 20) + 224) & 0xFF;

            this.applyPixel0();
            this.applyPixel1();
            this.applyPixel2();
            this.applyPixel3();
            this.applyPixel4();
            this.applyPixel5();
            this.applyPixel6();
            this.applyPixel7();
        }

        // Solid-colour modes: all pixels = solidGrb.
        if (this.mode === AnimMode.RED) {
            this.pixel0 = this.solidGrb;
            this.pixel1 = this.solidGrb;
            this.pixel2 = this.solidGrb;
            this.pixel3 = this.solidGrb;
            this.pixel4 = this.solidGrb;
            this.pixel5 = this.solidGrb;
            this.pixel6 = this.solidGrb;
            this.pixel7 = this.solidGrb;
        }
        if (this.mode === AnimMode.GREEN) {
            this.pixel0 = this.solidGrb;
            this.pixel1 = this.solidGrb;
            this.pixel2 = this.solidGrb;
            this.pixel3 = this.solidGrb;
            this.pixel4 = this.solidGrb;
            this.pixel5 = this.solidGrb;
            this.pixel6 = this.solidGrb;
            this.pixel7 = this.solidGrb;
        }
        if (this.mode === AnimMode.BLUE) {
            this.pixel0 = this.solidGrb;
            this.pixel1 = this.solidGrb;
            this.pixel2 = this.solidGrb;
            this.pixel3 = this.solidGrb;
            this.pixel4 = this.solidGrb;
            this.pixel5 = this.solidGrb;
            this.pixel6 = this.solidGrb;
            this.pixel7 = this.solidGrb;
        }
        // FREEZE mode: no pixel assignment — always_ff registers retain last value.
    }

    // Handle a received UART command byte.  Inlined into tick().
    // Sets mode, solidGrb, uartFast as appropriate.
    // Always sends ACK_BYTE back when command is recognised.
    private processCmd(): void {
        if (this.rx_data === CMD_AURORA) {
            this.mode     = AnimMode.AURORA;
            this.tx_data  = ACK_BYTE;
            this.tx_valid = 1;
        } else if (this.rx_data === CMD_RED) {
            this.mode     = AnimMode.RED;
            this.solidGrb = GRB_RED;
            this.tx_data  = ACK_BYTE;
            this.tx_valid = 1;
        } else if (this.rx_data === CMD_GREEN) {
            this.mode     = AnimMode.GREEN;
            this.solidGrb = GRB_GREEN;
            this.tx_data  = ACK_BYTE;
            this.tx_valid = 1;
        } else if (this.rx_data === CMD_BLUE) {
            this.mode     = AnimMode.BLUE;
            this.solidGrb = GRB_BLUE;
            this.tx_data  = ACK_BYTE;
            this.tx_valid = 1;
        } else if (this.rx_data === CMD_FASTER) {
            this.uartFast = 1;
            this.tx_data  = ACK_BYTE;
            this.tx_valid = 1;
        } else if (this.rx_data === CMD_SLOWER) {
            this.uartFast = 0;
            this.tx_data  = ACK_BYTE;
            this.tx_valid = 1;
        } else if (this.rx_data === CMD_FREEZE) {
            this.mode     = AnimMode.FREEZE;
            this.tx_data  = ACK_BYTE;
            this.tx_valid = 1;
        }
    }

    // Piecewise-linear HSV helpers: no local let vars to avoid module-level name collision.
    // seg0 (h < 85):   GRB = (h*3)<<16  | ((84-h)*3)<<8   (green↑ red↓ blue=0)
    // seg1 (h < 170):  GRB = ((169-h)*3)<<16 | (h-85)*3   (green↓ blue↑ red=0)
    // seg2 (h >= 170): GRB = ((h-170)*3)<<8  | (254-h)*3  (red↑  blue↓ green=0)

    private applyPixel0(): void {
        if (this.hue0 < H_SEG) {
            this.pixel0 = ((this.hue0 * H_MULT) << 16) | (((H_SEG_M1 - this.hue0) * H_MULT) << 8);
        } else if (this.hue0 < H_2SEG) {
            this.pixel0 = (((H_2SEG_M1 - this.hue0) * H_MULT) << 16) | ((this.hue0 - H_SEG) * H_MULT);
        } else {
            this.pixel0 = (((this.hue0 - H_2SEG) * H_MULT) << 8) | ((H_3SEG_M1 - this.hue0) * H_MULT);
        }
    }

    private applyPixel1(): void {
        if (this.hue1 < H_SEG) {
            this.pixel1 = ((this.hue1 * H_MULT) << 16) | (((H_SEG_M1 - this.hue1) * H_MULT) << 8);
        } else if (this.hue1 < H_2SEG) {
            this.pixel1 = (((H_2SEG_M1 - this.hue1) * H_MULT) << 16) | ((this.hue1 - H_SEG) * H_MULT);
        } else {
            this.pixel1 = (((this.hue1 - H_2SEG) * H_MULT) << 8) | ((H_3SEG_M1 - this.hue1) * H_MULT);
        }
    }

    private applyPixel2(): void {
        if (this.hue2 < H_SEG) {
            this.pixel2 = ((this.hue2 * H_MULT) << 16) | (((H_SEG_M1 - this.hue2) * H_MULT) << 8);
        } else if (this.hue2 < H_2SEG) {
            this.pixel2 = (((H_2SEG_M1 - this.hue2) * H_MULT) << 16) | ((this.hue2 - H_SEG) * H_MULT);
        } else {
            this.pixel2 = (((this.hue2 - H_2SEG) * H_MULT) << 8) | ((H_3SEG_M1 - this.hue2) * H_MULT);
        }
    }

    private applyPixel3(): void {
        if (this.hue3 < H_SEG) {
            this.pixel3 = ((this.hue3 * H_MULT) << 16) | (((H_SEG_M1 - this.hue3) * H_MULT) << 8);
        } else if (this.hue3 < H_2SEG) {
            this.pixel3 = (((H_2SEG_M1 - this.hue3) * H_MULT) << 16) | ((this.hue3 - H_SEG) * H_MULT);
        } else {
            this.pixel3 = (((this.hue3 - H_2SEG) * H_MULT) << 8) | ((H_3SEG_M1 - this.hue3) * H_MULT);
        }
    }

    private applyPixel4(): void {
        if (this.hue4 < H_SEG) {
            this.pixel4 = ((this.hue4 * H_MULT) << 16) | (((H_SEG_M1 - this.hue4) * H_MULT) << 8);
        } else if (this.hue4 < H_2SEG) {
            this.pixel4 = (((H_2SEG_M1 - this.hue4) * H_MULT) << 16) | ((this.hue4 - H_SEG) * H_MULT);
        } else {
            this.pixel4 = (((this.hue4 - H_2SEG) * H_MULT) << 8) | ((H_3SEG_M1 - this.hue4) * H_MULT);
        }
    }

    private applyPixel5(): void {
        if (this.hue5 < H_SEG) {
            this.pixel5 = ((this.hue5 * H_MULT) << 16) | (((H_SEG_M1 - this.hue5) * H_MULT) << 8);
        } else if (this.hue5 < H_2SEG) {
            this.pixel5 = (((H_2SEG_M1 - this.hue5) * H_MULT) << 16) | ((this.hue5 - H_SEG) * H_MULT);
        } else {
            this.pixel5 = (((this.hue5 - H_2SEG) * H_MULT) << 8) | ((H_3SEG_M1 - this.hue5) * H_MULT);
        }
    }

    private applyPixel6(): void {
        if (this.hue6 < H_SEG) {
            this.pixel6 = ((this.hue6 * H_MULT) << 16) | (((H_SEG_M1 - this.hue6) * H_MULT) << 8);
        } else if (this.hue6 < H_2SEG) {
            this.pixel6 = (((H_2SEG_M1 - this.hue6) * H_MULT) << 16) | ((this.hue6 - H_SEG) * H_MULT);
        } else {
            this.pixel6 = (((this.hue6 - H_2SEG) * H_MULT) << 8) | ((H_3SEG_M1 - this.hue6) * H_MULT);
        }
    }

    private applyPixel7(): void {
        if (this.hue7 < H_SEG) {
            this.pixel7 = ((this.hue7 * H_MULT) << 16) | (((H_SEG_M1 - this.hue7) * H_MULT) << 8);
        } else if (this.hue7 < H_2SEG) {
            this.pixel7 = (((H_2SEG_M1 - this.hue7) * H_MULT) << 16) | ((this.hue7 - H_SEG) * H_MULT);
        } else {
            this.pixel7 = (((this.hue7 - H_2SEG) * H_MULT) << 8) | ((H_3SEG_M1 - this.hue7) * H_MULT);
        }
    }
}

export { AuroraGenUart };
