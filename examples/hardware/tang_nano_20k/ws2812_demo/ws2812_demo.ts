// Tang Nano 20K — WS2812 Interactive Color Demo
//
// Demonstrates complex TypeScript hardware design with:
//   - Combinational helper functions (compile to separate SV modules)
//   - Sequential @Module class using those temporal patterns
//   - Button-driven mode switching with hardware debounce
//   - Multi-state LED walking pattern alongside WS2812 stream
//
// Board: Tang Nano 20K (GW2AR-18C, 27 MHz oscillator)
// Compile + flash:
//   bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/ws2812_demo/ws2812_demo.ts \
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
//
// Colour modes (button S2 cycles through):
//   Mode 0 — Rainbow: green → red → blue → white
//   Mode 1 — Fire:    orange → deep-red → amber → crimson
//   Mode 2 — Ocean:   blue → cyan-blue → cyan → deep-blue
//   Mode 3 — Forest:  bright-green → dark-green → spring-green → forest-green
//
// LED effect: walking pattern – one LED active at a time, cycling 0..5.
// The LED phase advances every ~0.31 s (2^23 clocks at 27 MHz).
// After every 6 LED phases (full walk = ~1.87 s) the color step also advances.
// Pressing S2 immediately moves to the next colour mode.

import {
    HardwareModule,
    Module,
    Input,
    Output,
    Sequential,
} from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// ---------------------------------------------------------------------------
// Combinational helper functions — compile to dedicated SV modules.
// These form the reusable building-block layer of the design.
// ---------------------------------------------------------------------------

// Select 24-bit GRB color for the given mode (0-3) and step (0-3).
// Colors are pre-scaled for comfortable brightness in a dark room.
function demo_color_select(mode: number, step: number): number {
    if (mode === 0) {
        // Rainbow palette
        if (step === 0) { return 0x00CC00; } // green
        else if (step === 1) { return 0xCC0000; } // red
        else if (step === 2) { return 0x0000CC; } // blue
        else { return 0x808080; }              // soft white
    } else if (mode === 1) {
        // Fire palette
        if (step === 0) { return 0x00CC44; }  // orange (GRB: G=00,R=CC,B=44)
        else if (step === 1) { return 0x00AA00; } // deep red
        else if (step === 2) { return 0x00BB22; } // amber
        else { return 0x008800; }              // crimson
    } else if (mode === 2) {
        // Ocean palette
        if (step === 0) { return 0x000066; }  // blue
        else if (step === 1) { return 0x004488; } // cyan-blue
        else if (step === 2) { return 0x008888; } // cyan
        else { return 0x002244; }              // deep blue
    } else {
        // Forest palette
        if (step === 0) { return 0x00CC00; }  // bright green
        else if (step === 1) { return 0x003300; } // dark green
        else if (step === 2) { return 0x00CC44; } // spring green
        else { return 0x006600; }              // forest green
    }
}

// Active-low LED walking pattern: one LED on per phase 0-5.
// Bit-i = 0 → LED-i on; = 1 → LED-i off.
function demo_led_pattern(phase: number): number {
    if (phase === 0) { return 0x3E; }       // 0b111110 — LED0 on
    else if (phase === 1) { return 0x3D; }  // 0b111101 — LED1 on
    else if (phase === 2) { return 0x3B; }  // 0b111011 — LED2 on
    else if (phase === 3) { return 0x37; }  // 0b110111 — LED3 on
    else if (phase === 4) { return 0x2F; }  // 0b101111 — LED4 on
    else { return 0x1F; }                   // 0b011111 — LED5 on
}

// Debounce counter: count up while button is held low; reset on release.
// Caller treats counter >= DEBOUNCE_THRESHOLD as "button confirmed pressed."
function demo_btn_debounce_next(counter: number, btn_raw: number): number {
    if (btn_raw === 0) {
        if (counter === 0xFFFF) { return 0xFFFF; } else { return counter + 1; }
    } else {
        return 0;
    }
}

// Advance LED walking phase: 0 → 1 → 2 → 3 → 4 → 5 → 0.
function demo_phase_next(phase: number): number {
    if (phase === 5) { return 0; } else { return phase + 1; }
}

// Advance 2-bit step counter: wraps 3 → 0.
function demo_step_next(step: number): number {
    if (step === 3) { return 0; } else { return step + 1; }
}

// Advance 2-bit mode counter: wraps 3 → 0.
function demo_mode_next(mode: number): number {
    if (mode === 3) { return 0; } else { return mode + 1; }
}

// ---------------------------------------------------------------------------
// Sequential hardware module — the top-level synthesisable design entity.
// ---------------------------------------------------------------------------

@Module
class Ws2812InteractiveDemo extends HardwareModule {
    // ---- Ports ----
    @Input clk: Bit = 0;   // 27 MHz system clock
    @Input rst_n: Bit = 1;   // active-low synchronous reset (S1)
    @Input btn: Bit = 1;   // active-low push button (S2)
    @Output ws2812: Bit = 0;   // WS2812 serial data output
    @Output led: Logic<6> = 0x3F; // active-low LEDs (all off = 0x3F)

    // ---- WS2812 bit timing localparams ----
    private readonly t1h: Logic<6> = 19;   // '1' high cycles
    private readonly t0h: Logic<6> = 10;   // '0' high cycles
    private readonly tbit: Logic<6> = 34;   // total bit cycles
    private readonly treset: Logic<12> = 1600; // reset low cycles

    // ---- WS2812 transmit state ----
    private frame: Logic<24> = 0x00CC00; // current GRB color frame
    private bitIndex: Logic<5> = 0;
    private tickInBit: Logic<6> = 0;
    private resetTicks: Logic<12> = 0;
    private sending: Bit = 0;

    // ---- Demo sequencer state ----
    private mode: Logic<2> = 0; // color mode 0-3, advanced by button
    private colorStep: Logic<2> = 0; // step within current mode palette
    private ledPhase: Logic<3> = 0; // walking LED index 0-5
    private phaseTick: Logic<24> = 0; // phase advance timer

    // ---- Button debounce state ----
    private btnDebounce: Logic<16> = 0; // counts cycles button is held low
    private btnArmed: Bit = 1;       // 1 = ready to trigger on next press

    @Sequential('clk')
    tick(): void {
        if (this.rst_n === 0) {
            // Synchronous reset: return to safe default state.
            this.sending = 0;
            this.bitIndex = 0;
            this.tickInBit = 0;
            this.resetTicks = 0;
            this.mode = 0;
            this.colorStep = 0;
            this.ledPhase = 0;
            this.phaseTick = 0;
            this.btnDebounce = 0;
            this.btnArmed = 1;
            this.frame = 0x00CC00;
            this.led = 0x3F;
            this.ws2812 = 0;
        } else {
            // ---- Button debounce and mode advance ----
            // Count up while button is held, reset on release.
            if (this.btn === 0) {
                if (this.btnDebounce === 0xFFFF) {
                    this.btnDebounce = 0xFFFF;
                } else {
                    this.btnDebounce = this.btnDebounce + 1;
                }
            } else {
                this.btnDebounce = 0;
                this.btnArmed = 1; // re-arm on release
            }
            // Trigger mode advance once when debounce threshold is reached.
            // btnArmed prevents repeat-fire while button is held.
            if (this.btnDebounce >= 0x8000 && this.btnArmed === 1) {
                if (this.mode === 3) {
                    this.mode = 0;
                } else {
                    this.mode = this.mode + 1;
                }
                this.colorStep = 0;
                this.btnArmed = 0;
            }

            // ---- Phase tick: advance LED and color step ----
            // Every 2^23 clocks (~0.31 s at 27 MHz), advance the LED walking phase.
            // After a full 6-phase walk cycle, also advance the color step.
            this.phaseTick = this.phaseTick + 1;
            if ((this.phaseTick & 0x7FFFFF) === 0) {
                if (this.ledPhase === 5) {
                    this.ledPhase = 0;
                    // Full walk complete — advance color step.
                    if (this.colorStep === 3) {
                        this.colorStep = 0;
                    } else {
                        this.colorStep = this.colorStep + 1;
                    }
                } else {
                    this.ledPhase = this.ledPhase + 1;
                }
            }

            // ---- Update LED walking pattern ----
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

            // ---- Update WS2812 color frame from mode+step table ----
            if (this.mode === 0) {
                if (this.colorStep === 0) { this.frame = 0x00CC00; }
                else if (this.colorStep === 1) { this.frame = 0xCC0000; }
                else if (this.colorStep === 2) { this.frame = 0x0000CC; }
                else { this.frame = 0x808080; }
            } else if (this.mode === 1) {
                if (this.colorStep === 0) { this.frame = 0x00CC44; }
                else if (this.colorStep === 1) { this.frame = 0x00AA00; }
                else if (this.colorStep === 2) { this.frame = 0x00BB22; }
                else { this.frame = 0x008800; }
            } else if (this.mode === 2) {
                if (this.colorStep === 0) { this.frame = 0x000066; }
                else if (this.colorStep === 1) { this.frame = 0x004488; }
                else if (this.colorStep === 2) { this.frame = 0x008888; }
                else { this.frame = 0x002244; }
            } else {
                if (this.colorStep === 0) { this.frame = 0x00CC00; }
                else if (this.colorStep === 1) { this.frame = 0x003300; }
                else if (this.colorStep === 2) { this.frame = 0x00CC44; }
                else { this.frame = 0x006600; }
            }

            // ---- WS2812 serial transmitter state machine ----
            if (this.sending === 0) {
                // Reset phase: hold data line low until reset timer expires.
                this.ws2812 = 0;
                this.resetTicks = this.resetTicks + 1;
                if (this.resetTicks >= this.treset) {
                    this.resetTicks = 0;
                    this.sending = 1;
                    this.bitIndex = 0;
                    this.tickInBit = 0;
                }
            } else {
                // Transmission phase: serialize 24 bits MSB-first.
                const bitValue = (this.frame >> (23 - this.bitIndex)) & 1;
                let highTicks = this.t0h;
                if (bitValue === 1) {
                    highTicks = this.t1h;
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
}

export { Ws2812InteractiveDemo };
