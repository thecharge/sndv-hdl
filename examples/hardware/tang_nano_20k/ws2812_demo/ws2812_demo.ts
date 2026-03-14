// ws2812_demo.ts - Tang Nano 20K flagship WS2812 rainbow demo. Top-level wiring.
//
// Behaviour:
//   S2 (btn,  pin 87) - hold to cycle the WS2812 RGB LED through a smooth
//                       6-colour rainbow. Release: LED goes dark, generator
//                       resets to RED so the next press always starts fresh.
//   S1 (rst_n, pin 88) - hold to walk the six board LEDs one at a time from
//                        LED 0 through LED 5 and back to LED 0.
//                        Release: all LEDs off, walk resets to LED 0.
//
// Three-file design compiled together as a single unit:
//   ws2812_serialiser.ts - WS2812 NeoPixel protocol encoder
//                          (reset pulse + 24-bit GRB transmission,
//                           continuous refresh while enable is high)
//   rainbow_gen.ts       - Smooth 6-hue rainbow colour sequencer
//                          (steps every approx 0.31 s at 27 MHz)
//   ws2812_demo.ts       - This file: top-level port wiring + LED walk
//
// Both S1 and S2 are active-low push buttons with internal pull-ups.
// Neither button drives the hardware reset of any flip-flop. All reset
// logic is synchronous and software-controlled (see @ModuleConfig below).
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
//   clk    -> pin 4   (27 MHz oscillator)
//   rst_n  -> pin 88  (S1, active-low, internal pull-up)
//   btn    -> pin 87  (S2, active-low, internal pull-up)
//   ws2812 -> pin 79  (WS2812 data line, 8 mA drive)
//   led[0] -> pin 15  (active-low)
//   led[1] -> pin 16
//   led[2] -> pin 17
//   led[3] -> pin 18
//   led[4] -> pin 19
//   led[5] -> pin 20

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { RainbowGen } from './rainbow_gen';
import { Ws2812Serialiser } from './ws2812_serialiser';

// Clock cycles per LED dwell step during LED walk (approx 0.31 s at 27 MHz).
// Uses the same 23-bit mask as RainbowGen for consistency.
const WALK_DWELL_MASK  = 0x7FFFFF;
const LED_COUNT        = 6;
const ALL_LEDS_OFF     = 0x3F;  // active-low: all bits high = all LEDs off

// LED walk drive values (active-low: only the target LED bit is cleared)
const LED_WALK_0 = 0x3E;  // bit 0 low -> LED 0 on
const LED_WALK_1 = 0x3D;  // bit 1 low -> LED 1 on
const LED_WALK_2 = 0x3B;  // bit 2 low -> LED 2 on
const LED_WALK_3 = 0x37;  // bit 3 low -> LED 3 on
const LED_WALK_4 = 0x2F;  // bit 4 low -> LED 4 on
const LED_WALK_5 = 0x1F;  // bit 5 low -> LED 5 on

// @ModuleConfig disables automatic async reset injection.
// rst_n and btn are treated as plain button inputs read inside the
// sequential block, not as hardware reset signals.
@Module
@ModuleConfig('resetSignal: "no_rst"')
class Ws2812Demo extends HardwareModule {
    // External ports
    @Input  clk:    Bit      = 0;
    @Input  rst_n:  Bit      = 1;    // S1 (active-low): hold to walk LEDs
    @Input  btn:    Bit      = 1;    // S2 (active-low): hold for rainbow
    @Output ws2812: Bit      = 0;
    @Output led:    Logic<6> = ALL_LEDS_OFF;

    // Intermediate wires (auto-wired to submodule ports by matching name)
    private enable: Bit       = 0;   // Ws2812Demo -> RainbowGen.enable + Ws2812Serialiser.enable
    private frame:  Logic<24> = 0;   // RainbowGen.frame -> Ws2812Serialiser.frame
    private load:   Bit       = 0;   // RainbowGen.load  -> Ws2812Serialiser.load

    // Submodule instances
    @Submodule rainbow    = new RainbowGen();
    @Submodule serialiser = new Ws2812Serialiser();

    // LED walk state
    private walkTick:  Logic<24> = 0;  // dwell counter (advances while S1 held)
    private ledPhase:  Logic<3>  = 0;  // active LED index: 0 to 5

    @Sequential('clk')
    tick(): void {
        // S2 held (btn = 0) -> enable rainbow cycling; S2 released -> off
        if (this.btn === 0) {
            this.enable = 1;
        } else {
            this.enable = 0;
        }

        // S1 held (rst_n = 0) -> walk LEDs one-by-one
        if (this.rst_n === 0) {
            this.walkTick = this.walkTick + 1;
            // Advance one LED every 2^23 clocks (approx 0.31 s at 27 MHz)
            if ((this.walkTick & WALK_DWELL_MASK) === 0) {
                if (this.ledPhase === LED_COUNT - 1) {
                    this.ledPhase = 0;
                } else {
                    this.ledPhase = this.ledPhase + 1;
                }
            }
            if (this.ledPhase === 0) {
                this.led = LED_WALK_0;
            } else if (this.ledPhase === 1) {
                this.led = LED_WALK_1;
            } else if (this.ledPhase === 2) {
                this.led = LED_WALK_2;
            } else if (this.ledPhase === 3) {
                this.led = LED_WALK_3;
            } else if (this.ledPhase === 4) {
                this.led = LED_WALK_4;
            } else {
                this.led = LED_WALK_5;
            }
        } else {
            // S1 released: all LEDs off, reset walk state to LED 0
            this.led      = ALL_LEDS_OFF;
            this.walkTick = 0;
            this.ledPhase = 0;
        }
    }
}

export { Ws2812Demo };
