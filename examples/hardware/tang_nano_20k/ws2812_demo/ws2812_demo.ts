// Tang Nano 20K — WS2812 Interactive Demo
//
// Behaviour:
//   S2 (btn, pin 87)  — hold to make the WS2812 strip output solid RED.
//                       Release: strip goes off (black).
//   S1 (rst_n, pin 88) — hold to walk the six board LEDs one-at-a-time.
//                       Release: all LEDs off; walk restarts from LED 0
//                       the next time you hold S1.
//
// No colour modes. No sequences. No debouncing complexity.
// This is the simplest possible interactive hardware demo for this board.
//
// Board: Tang Nano 20K (GW2AR-18C, 27 MHz oscillator)
// Compile + flash:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/ws2812_demo/ws2812_demo.ts \
//     --board boards/tang_nano_20k.board.json --out .artifacts/ws2812_demo --flash
//
// Hardware connections (from boards/tang_nano_20k.board.json):
//   clk     → pin 4   (27 MHz oscillator)
//   rst_n   → pin 88  (S1 push-button, active-low, internal pull-up)
//   btn     → pin 87  (S2 push-button, active-low, internal pull-up)
//   ws2812  → pin 79  (WS2812 data line, drive strength 8 mA)
//   led[0]  → pin 15  (active-low LED, 0 = on)
//   led[1]  → pin 16
//   led[2]  → pin 17
//   led[3]  → pin 18
//   led[4]  → pin 19
//   led[5]  → pin 20
//
// WS2812 bit timing at 27 MHz (~37 ns/cycle):
//   '0' bit: 10 cycles high (~370 ns) + 24 cycles low
//   '1' bit: 19 cycles high (~703 ns) + 15 cycles low
//   Total bit period: 34 cycles (~1.26 µs)
//   Reset pulse: 1600 cycles low (≥ 59 µs, exceeds 50 µs spec)
//
// Color frame format: 24-bit GRB (WS2812 byte order: green, red, blue)
//   RED  = 0x00CC00  (G=00 R=CC B=00)
//   OFF  = 0x000000  (black)
//
// LED walk speed: one step every 2^23 clocks ≈ 0.31 s at 27 MHz.

import {
    HardwareModule,
    Module,
    Input,
    Output,
    Sequential,
} from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// ---------------------------------------------------------------------------
// Sequential hardware module — top-level synthesisable design entity.
// ---------------------------------------------------------------------------

@Module
class Ws2812InteractiveDemo extends HardwareModule {
    // ---- Ports ----
    @Input clk: Bit = 0;   // 27 MHz system clock
    @Input rst_n: Bit = 1;   // S1 active-low: hold to walk LEDs
    @Input btn: Bit = 1;   // S2 active-low: hold for RED WS2812
    @Output ws2812: Bit = 0;   // WS2812 serial data output
    @Output led: Logic<6> = 0x3F; // active-low LEDs (0x3F = all off)

    // ---- WS2812 bit timing (localparams in generated SV) ----
    private readonly t1h: Logic<6> = 19;   // '1' high cycles
    private readonly t0h: Logic<6> = 10;   // '0' high cycles
    private readonly tbit: Logic<6> = 34;   // total bit period
    private readonly treset: Logic<12> = 1600; // reset pulse length

    // ---- WS2812 serialiser state ----
    private frame: Logic<24> = 0;  // 24-bit GRB color frame
    private bitIndex: Logic<5> = 0;
    private tickInBit: Logic<6> = 0;
    private resetTicks: Logic<12> = 0;
    private sending: Bit = 0;

    // ---- LED walk state ----
    private walkTick: Logic<24> = 0;   // timer; advances only while S1 held
    private ledPhase: Logic<3> = 0;   // current active LED index 0-5

    @Sequential('clk')
    tick(): void {
        // ---- WS2812 color: S2 held → RED, released → OFF ----
        if (this.btn === 0) {
            this.frame = 0x00CC00;  // GRB: G=00 R=CC B=00 → RED
        } else {
            this.frame = 0x000000;  // black / off
        }

        // ---- LED walk: active only while S1 held ----
        if (this.rst_n === 0) {
            // Advance walk timer; increment phase every 2^23 clocks (~0.31 s)
            this.walkTick = this.walkTick + 1;
            if ((this.walkTick & 0x7FFFFF) === 0) {
                if (this.ledPhase === 5) {
                    this.ledPhase = 0;
                } else {
                    this.ledPhase = this.ledPhase + 1;
                }
            }
            // One LED on at a time (active-low)
            if (this.ledPhase === 0) {
                this.led = 0x3E;
            } else if (this.ledPhase === 1) {
                this.led = 0x3D;
            } else if (this.ledPhase === 2) {
                this.led = 0x3B;
            } else if (this.ledPhase === 3) {
                this.led = 0x37;
            } else if (this.ledPhase === 4) {
                this.led = 0x2F;
            } else {
                this.led = 0x1F;
            }
        } else {
            // S1 released: all LEDs off, reset walk state for next press
            this.led = 0x3F;
            this.walkTick = 0;
            this.ledPhase = 0;
        }

        // ---- WS2812 serial state machine ----
        if (this.sending === 0) {
            // Reset phase: hold data line low until reset timer expires
            this.ws2812 = 0;
            this.resetTicks = this.resetTicks + 1;
            if (this.resetTicks >= this.treset) {
                this.resetTicks = 0;
                this.sending = 1;
                this.bitIndex = 0;
                this.tickInBit = 0;
            }
        } else {
            // Transmission phase: serialise 24 bits MSB-first
            const bitValue = (this.frame >> (23 - this.bitIndex)) & 1;
            let highTicks: Logic<6> = 10;
            if (bitValue === 1) {
                highTicks = 19;
            }
            if (this.tickInBit < highTicks) {
                this.ws2812 = 1;
            } else {
                this.ws2812 = 0;
            }
            this.tickInBit = this.tickInBit + 1;
            if (this.tickInBit >= this.tbit) {
                this.tickInBit = 0;
                this.bitIndex = this.bitIndex + 1;
                if (this.bitIndex >= 24) {
                    this.sending = 0;
                    this.bitIndex = 0;
                }
            }
        }
    }
}

export { Ws2812InteractiveDemo };

