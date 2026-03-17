// This demo was generated with Grok - no assistense needed
// knight_rider.ts — Tang Nano 20K Knight Rider LED scanner (interactive!)
// Classic car-light chase effect on the 6 onboard LEDs (active-low: 0 = ON).
// The light scans back and forth (0→5→0). Hold the board button (btn, pin 87, S2)
// to pause the animation. Release to resume. Pure clock-driven, no extra peripherals.
//
// This is fully compliant with the ts2v runtime and board definition.
// Drop it into: examples/hardware/tang_nano_20k/knight_rider/knight_rider.ts
//
// Compile + flash (persistent to external flash):
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/knight_rider/knight_rider.ts \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/knight_rider \
//     --flash
//
// Put board in programming mode (check Tang Nano 20K manual), then power-cycle after flash.
// Confirmed compatible with the existing blinker/breathe/ws2812_demo style.

import {
    HardwareModule,
    Module,
    Input,
    Output,
    Sequential,
} from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class KnightRider extends HardwareModule {
    @Input clk: Bit = 0;          // 27 MHz system clock
    @Input btn: Bit = 0;          // active-high pause button (pin 87)
    @Output led: Logic<6> = 0x3e; // start with LED 0 lit (active-low)

    private counter: Logic<22> = 0;   // timing divider (~6–7 steps/sec)
    private position: Logic<3> = 0;   // 0–5 LED index
    private direction: Bit = 0;       // 0 = forward, 1 = reverse

    @Sequential('clk')
    tick(): void {
        this.counter = this.counter + 1;

        // Update position/direction only when timer wraps AND button is NOT pressed
        if (this.counter === 0 && this.btn === 0) {
            if (this.direction === 0) {
                // Moving forward
                if (this.position < 5) {
                    this.position = this.position + 1;
                } else {
                    this.direction = 1;
                    this.position = this.position - 1; // bounce at 5 → 4
                }
            } else {
                // Moving backward
                if (this.position > 0) {
                    this.position = this.position - 1;
                } else {
                    this.direction = 0;
                    this.position = this.position + 1; // bounce at 0 → 1
                }
            }
        }

        // Drive LEDs from current position (re-assigned every clock → clean register)
        if (this.position === 0) {
            this.led = 0x3e;
        } else if (this.position === 1) {
            this.led = 0x3d;
        } else if (this.position === 2) {
            this.led = 0x3b;
        } else if (this.position === 3) {
            this.led = 0x37;
        } else if (this.position === 4) {
            this.led = 0x2f;
        } else if (this.position === 5) {
            this.led = 0x1f;
        } else {
            this.led = 0x3f; // safety (all off)
        }
    }
}

export { KnightRider };