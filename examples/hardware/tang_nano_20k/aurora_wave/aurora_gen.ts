// aurora_gen.ts - 8-pixel aurora wave colour generator (smooth piecewise-linear HSV).
//
// Drives eight WS2812 pixels with a smoothly shifting rainbow wave.
// Each pixel has a fixed phase offset (32 hue units = 1/8 of the 256-step wheel)
// from its neighbour, so all 8 pixels always span the full rainbow simultaneously.
//
// Colour model: piecewise-linear HSV (full saturation, ~99% value), GRB byte order.
//   GRB format: bits [23:16] = Green, [15:8] = Red, [7:0] = Blue
//   3-segment hue wheel, each segment 85 steps, channel ramp = step × 3 (max 252):
//     h in [0, 84]:   G = h×3 (up),   R = (84-h)×3 (down), B = 0
//     h in [85, 169]: G = (169-h)×3 (down), R = 0, B = (h-85)×3 (up)
//     h in [170, 255]: G = 0, R = (h-170)×3 (up), B = (254-h)×3 (down)
//
// vs. previous 16-entry palette: 16× smoother (256 steps vs 16 steps per revolution).
//
// Animation timing at 27 MHz (PHASE_NORMAL = 1):
//   phase bits [27:20] = 8-bit hue for pixel0.
//   One hue step = 2^20 clocks ≈ 38.8 ms.
//   Full rainbow revolution: 256 × 38.8 ms ≈ 9.9 s.
//   Fast mode (S2 held): phase += 8 → ≈ 1.2 s per revolution.
//
// Board LEDs: 6 active-low LEDs walk in ping-pong sync with the wave phase.
// Button (btn, S2, active-high): hold for 8× speed.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// Piecewise-linear HSV parameters (hue 0..255, 3 segments of 85 steps).
const H_SEG     = 85;   // segment 0→1 boundary
const H_2SEG    = 170;  // segment 1→2 boundary
const H_SEG_M1  = 84;   // H_SEG  - 1: max ramp within seg 0
const H_2SEG_M1 = 169;  // H_2SEG - 1: max ramp within seg 1
const H_3SEG_M1 = 254;  // 255 - 1: max ramp within seg 2
const H_MULT    = 3;    // channel ramp rate (84 × 3 = 252 ≈ 99% brightness)

// Pixel hue spacing: 32 units = 1/8 of the 256-step wheel.
const HUE_STEP  = 32;

// Active-low LED bus values (6 onboard LEDs, 0 = ON).
const LED_OFF = 0x3F;
const LED_0   = 0x3E;
const LED_1   = 0x3D;
const LED_2   = 0x3B;
const LED_3   = 0x37;
const LED_4   = 0x2F;
const LED_5   = 0x1F;

// Phase increment per clock tick.
const PHASE_FAST   = 8;
const PHASE_NORMAL = 1;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class AuroraGen extends HardwareModule {
    @Input  clk:    Bit       = 0;
    @Input  btn:    Bit       = 0;   // S2 active-high: hold for fast mode
    @Output pixel0: Logic<24> = 0;
    @Output pixel1: Logic<24> = 0;
    @Output pixel2: Logic<24> = 0;
    @Output pixel3: Logic<24> = 0;
    @Output pixel4: Logic<24> = 0;
    @Output pixel5: Logic<24> = 0;
    @Output pixel6: Logic<24> = 0;
    @Output pixel7: Logic<24> = 0;
    @Output led:    Logic<6>  = LED_OFF;

    // Free-running phase counter.  bits [27:20] = 8-bit hue for pixel0.
    private phase: Logic<28> = 0;

    // Per-pixel hue angles (0..255).  8-bit → 256 smooth steps per revolution.
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
        // Advance phase: fast mode when button held.
        if (this.btn === 1) {
            this.phase = this.phase + PHASE_FAST;
        } else {
            this.phase = this.phase + PHASE_NORMAL;
        }

        // Extract 8-bit hue for pixel0 from bits [27:20].
        // Each subsequent pixel offset by 32 hue units (1/8 of 256-step wheel)
        // so all 8 pixels always span the complete rainbow simultaneously.
        this.hue0 = (this.phase >> 20) & 0xFF;
        this.hue1 = ((this.phase >> 20) + HUE_STEP) & 0xFF;
        this.hue2 = ((this.phase >> 20) + 64) & 0xFF;
        this.hue3 = ((this.phase >> 20) + 96) & 0xFF;
        this.hue4 = ((this.phase >> 20) + 128) & 0xFF;
        this.hue5 = ((this.phase >> 20) + 160) & 0xFF;
        this.hue6 = ((this.phase >> 20) + 192) & 0xFF;
        this.hue7 = ((this.phase >> 20) + 224) & 0xFF;

        // Board LED ping-pong: 8-step bounce across 6 LEDs, one step per 2^23 clocks.
        let ledCyc: Logic<4> = (this.phase >> 23) & 0xF;
        if (ledCyc < 2) {
            this.led = LED_0;
        } else if (ledCyc < 4) {
            this.led = LED_1;
        } else if (ledCyc < 6) {
            this.led = LED_2;
        } else if (ledCyc < 8) {
            this.led = LED_3;
        } else if (ledCyc < 10) {
            this.led = LED_4;
        } else if (ledCyc < 12) {
            this.led = LED_5;
        } else if (ledCyc < 14) {
            this.led = LED_4;
        } else {
            this.led = LED_3;
        }

        // Piecewise-linear HSV → GRB for each pixel.
        // Helpers only reference this.hueN and this.pixelN (no local let — avoids collision).
        this.applyPixel0();
        this.applyPixel1();
        this.applyPixel2();
        this.applyPixel3();
        this.applyPixel4();
        this.applyPixel5();
        this.applyPixel6();
        this.applyPixel7();
    }

    // Each applyPixelN maps hueN → GRB via 3-segment piecewise linear formula:
    //   seg0 (h < 85):   GRB = (h*3)<<16 | ((84-h)*3)<<8        green↑ red↓
    //   seg1 (h < 170):  GRB = ((169-h)*3)<<16 | (h-85)*3       green↓ blue↑
    //   seg2 (h >= 170): GRB = ((h-170)*3)<<8 | (254-h)*3       red↑  blue↓

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

export { AuroraGen };
