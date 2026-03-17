// ws2812_demo.ts - Tang Nano 20K WS2812 rainbow + LED walk demo
//
// Behaviour:
//   S2 (btn,   pin 87) - hold to cycle the WS2812 strip through a 6-colour
//                        rainbow.  Release: strip immediately goes dark and
//                        the colour generator resets to RED.
//   S1 (rst_n, pin 88) - hold to walk the six board LEDs one at a time.
//                        Release: all LEDs off; walk phase resets to LED 0.
//
// Three-file design compiled together as a single unit:
//   ws2812_serialiser.ts  - WS2812 NeoPixel protocol encoder
//   rainbow_gen.ts        - Smooth 6-hue rainbow colour sequencer
//   ws2812_demo.ts        - This file: top-level port wiring + LED walk
//
// Board connections (tang_nano_20k.board.json):
//   clk    -> pin 4   (27 MHz oscillator)
//   rst_n  -> pin 88  (S1, active-high: pull-down to GND at rest, press = 1)
//   btn    -> pin 87  (S2, active-high: pull-down to GND at rest, press = 1)
//   ws2812 -> pin 79  (WS2812 data line)
//   led[0] -> pin 15, led[1] -> pin 16, led[2] -> pin 17
//   led[3] -> pin 18, led[4] -> pin 19, led[5] -> pin 20 (all active-low)
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/ws2812_demo \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/ws2812_demo [--flash]

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { RainbowGen } from './rainbow_gen';
import { Ws2812Serialiser } from './ws2812_serialiser';

// Timing: dwell counter mask - advance LED every 2^23 clocks (~0.31 s at 27 MHz).
const WALK_DWELL_MASK = 0x7FFFFF;
// LED count used to wrap the walk phase index.
const LED_COUNT = 6;
// Active-low LED bus: all bits high = all LEDs off.
const ALL_LEDS_OFF = 0x3F;
// Active-low LED drive values: only the target LED bit is cleared.
const LED_WALK_0 = 0x3E;
const LED_WALK_1 = 0x3D;
const LED_WALK_2 = 0x3B;
const LED_WALK_3 = 0x37;
const LED_WALK_4 = 0x2F;
const LED_WALK_5 = 0x1F;

// @ModuleConfig disables automatic reset injection so that rst_n and btn are
// read as plain inputs inside the sequential block.
@Module
@ModuleConfig('resetSignal: "no_rst"')
class Ws2812Demo extends HardwareModule {
    @Input clk: Bit = 0;
    @Input rst_n: Bit = 0;  // S1, active-high (pull-down, rest = 0)
    @Input btn: Bit = 0;  // S2, active-high (pull-down, rest = 0)
    @Output ws2812: Bit = 0;
    @Output led: Logic<6> = ALL_LEDS_OFF;

    // Intermediate wires auto-connected to submodule ports by matching name.
    private enable: Bit = 0;
    private frame: Logic<24> = 0;

    @Submodule rainbow = new RainbowGen();
    @Submodule serialiser = new Ws2812Serialiser();

    private walkTick: Logic<24> = 0;
    private ledPhase: Logic<3> = 0;

    @Sequential('clk')
    tick(): void {
        // S2 held (btn = 1) -> enable rainbow; released -> off
        if (this.btn === 1) {
            this.enable = 1;
        } else {
            this.enable = 0;
        }

        // S1 held (rst_n = 1) -> walk LEDs one-by-one
        if (this.rst_n === 1) {
            this.walkTick = this.walkTick + 1;
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
            // S1 released: all LEDs off, reset walk state
            this.led = ALL_LEDS_OFF;
            this.walkTick = 0;
            this.ledPhase = 0;
        }
    }
}

export { Ws2812Demo };
