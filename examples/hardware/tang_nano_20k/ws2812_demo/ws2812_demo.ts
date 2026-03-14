// ws2812_demo.ts — Tang Nano 20K flagship WS2812 rainbow demo.  Top-level wiring.
//
// Behaviour:
//   S2 (btn,   pin 87) — hold to cycle the WS2812 strip through a smooth
//                        6-colour rainbow.  Release: strip immediately goes
//                        dark and the colour generator resets to RED.
//   S1 (rst_n, pin 88) — hold to walk the six board LEDs one at a time.
//                        Release: all LEDs off; walk phase resets to LED 0.
//
// Three-file design — compiled together as a single unit:
//   ws2812_serialiser.ts  — WS2812 NeoPixel protocol encoder
//                           (reset pulse + 24-bit GRB transmission)
//   rainbow_gen.ts        — Smooth 6-hue rainbow colour sequencer
//                           (steps every ~0.31 s at 27 MHz)
//   ws2812_demo.ts        — This file: top-level port wiring + LED walk
//
// Compile (without flash):
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/ws2812_demo \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/ws2812_demo
//
// Compile + flash:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/ws2812_demo \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/ws2812_demo --flash
//
// Board connections (tang_nano_20k.board.json):
//   clk    → pin 4   (27 MHz oscillator)
//   rst_n  → pin 88  (S1, active-low, internal pull-up) — used as button input
//   btn    → pin 87  (S2, active-low, internal pull-up)
//   ws2812 → pin 79  (WS2812 data line, 8 mA drive)
//   led[0] → pin 15  (active-low)   led[1] → pin 16
//   led[2] → pin 17                  led[3] → pin 18
//   led[4] → pin 19                  led[5] → pin 20

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
// The two sibling modules — compiled together with this file as one SV unit.
// The ts2v compiler concatenates all .ts files in the directory before
// code-gen, so these imports provide TypeScript type information only.
import { RainbowGen } from './rainbow_gen';
import { Ws2812Serialiser } from './ws2812_serialiser';

// ── Top-level wiring module ─────────────────────────────────────────────────
// @ModuleConfig sets resetSignal to a non-existent port name so that rst_n is
// treated as a plain board-button input inside the sequential block rather than
// being wired to the async reset of every flip-flop.  Without this, rst_n=0
// would hold all registers in their reset state and the LED walk could never run.

@Module
@ModuleConfig('resetSignal: "no_rst"')
class Ws2812Demo extends HardwareModule {
    // ── External ports ──────────────────────────────────────────────────────
    @Input  clk:     Bit      = 0;       // 27 MHz oscillator
    @Input  rst_n:   Bit      = 1;       // S1 (active-low): hold to walk LEDs
    @Input  btn:     Bit      = 1;       // S2 (active-low): hold for rainbow
    @Output ws2812:  Bit      = 0;       // WS2812 serial data output
    @Output led:     Logic<6> = 0x3F;    // 6 board LEDs (active-low; 0x3F = all off)

    // ── Intermediate wires — auto-wired to submodule ports by matching name ─
    private enable:  Bit      = 0;       // Ws2812Demo → RainbowGen.enable
    private frame:   Logic<24> = 0;      // RainbowGen.frame → Ws2812Serialiser.frame
    private load:    Bit      = 0;       // RainbowGen.load  → Ws2812Serialiser.load

    // ── Submodule instances ─────────────────────────────────────────────────
    @Submodule rainbow    = new RainbowGen();
    @Submodule serialiser = new Ws2812Serialiser();

    // ── LED walk state ──────────────────────────────────────────────────────
    private walkTick:  Logic<24> = 0;    // dwell counter (advances while S1 held)
    private ledPhase:  Logic<3>  = 0;    // active LED index 0–5

    // ── Sequential logic ────────────────────────────────────────────────────
    // Clocked on posedge clk only (no async reset — see @ModuleConfig above).
    @Sequential('clk')
    tick(): void {
        // S2 held (btn = 0) → enable rainbow cycling; S2 released → off
        if (this.btn === 0) {
            this.enable = 1;
        } else {
            this.enable = 0;
        }

        // S1 held (rst_n = 0) → walk LEDs one-by-one
        if (this.rst_n === 0) {
            this.walkTick = this.walkTick + 1;
            // Advance one LED every 2^23 clocks (≈0.31 s at 27 MHz)
            if ((this.walkTick & 0x7FFFFF) === 0) {
                if (this.ledPhase === 5) {
                    this.ledPhase = 0;
                } else {
                    this.ledPhase = this.ledPhase + 1;
                }
            }
            if (this.ledPhase === 0) {
                this.led = 0x3E;     // LED0 on
            } else if (this.ledPhase === 1) {
                this.led = 0x3D;     // LED1 on
            } else if (this.ledPhase === 2) {
                this.led = 0x3B;     // LED2 on
            } else if (this.ledPhase === 3) {
                this.led = 0x37;     // LED3 on
            } else if (this.ledPhase === 4) {
                this.led = 0x2F;     // LED4 on
            } else {
                this.led = 0x1F;     // LED5 on
            }
        } else {
            // S1 released: all LEDs off, reset walk state
            this.led      = 0x3F;
            this.walkTick = 0;
            this.ledPhase = 0;
        }
    }
}

export { Ws2812Demo };
