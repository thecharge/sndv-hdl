// aurora_wave.ts - Aurora wave top-level demo for Tang Nano 20K.
//
// A full-rainbow wave flowing across 8 WS2812 LEDs simultaneously.
// All 8 pixels span the complete hue wheel at once, offset by 1/8 each.
// The wave slowly rotates (~10 s per full revolution at normal speed).
// Hold S2 (btn) to run at 8x speed.
//
// Three-file design compiled together as a single unit:
//   aurora_serialiser.ts - 8-pixel WS2812 chain serialiser
//   aurora_gen.ts        - Rainbow wave colour generator (8 pixels + board LEDs)
//   aurora_wave.ts       - This file: top-level port wiring
//
// Board connections (tang_nano_20k.board.json):
//   clk    -> pin 4  (27 MHz oscillator)
//   btn    -> pin 87 (S2, active-high: press = fast mode)
//   ws2812 -> pin 79 (WS2812 data line; connect strip pixel-0 closest to FPGA)
//   led[0] -> pin 15 ... led[5] -> pin 20 (active-low board LEDs)
//
// Wiring: aurora_gen.pixel0..pixel7 auto-wire to aurora_serialiser.pixel0..pixel7
// by signal name.  aurora_gen.led auto-wires to the top-level led output port.
// aurora_serialiser.ws2812 auto-wires to the top-level ws2812 output port.
//
// Flash:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/aurora_wave \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/aurora_wave \
//     --flash
//
// Single-LED fallback: with no external strip, pin 79 drives the on-board
// WS2812C-2020 which shows the pixel0 colour (slowly cycling through all hues).

import { HardwareModule, Module, ModuleConfig, Input, Output, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { AuroraGen } from './aurora_gen';
import { AuroraSerialiser } from './aurora_serialiser';

const ALL_LEDS_OFF = 0x3F;  // all 6 board LEDs off (active-low bus)

// Top-level module: no sequential logic.  All behaviour is in the submodules.
// Auto-wiring connects signals by matching name:
//   clk        -> gen.clk, ser.clk
//   btn        -> gen.btn
//   pixel0..7  -> gen.pixel0..7 (output) and ser.pixel0..7 (input)
//   ws2812     -> ser.ws2812 (output)
//   led        -> gen.led (output)
@Module
@ModuleConfig('resetSignal: "no_rst"')
class AuroraWave extends HardwareModule {
    @Input  clk:    Bit       = 0;
    @Input  btn:    Bit       = 0;
    @Output ws2812: Bit       = 0;
    @Output led:    Logic<6>  = ALL_LEDS_OFF;

    // Intermediate wires: auto-connected to gen outputs and ser inputs by name.
    private pixel0: Logic<24> = 0;
    private pixel1: Logic<24> = 0;
    private pixel2: Logic<24> = 0;
    private pixel3: Logic<24> = 0;
    private pixel4: Logic<24> = 0;
    private pixel5: Logic<24> = 0;
    private pixel6: Logic<24> = 0;
    private pixel7: Logic<24> = 0;

    @Submodule gen = new AuroraGen();
    @Submodule ser = new AuroraSerialiser();
}

export { AuroraWave };
