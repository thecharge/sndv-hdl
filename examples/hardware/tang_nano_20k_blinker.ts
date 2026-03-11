// Tang Nano 20K LED Blinker — ts2v v1.0.0
// Valid TypeScript — passes tsc --strict with experimentalDecorators
//
// Target: Sipeed Tang Nano 20K (GW2AR-18C, 27 MHz crystal)
// Compile: npx ts2v compile examples/tang_nano_20k_blinker.ts

import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
  Combinational,
  Assert,
} from '../../src/runtime';
import type { Logic, Bit } from '../../src/runtime';

/**
 * LED blink pattern selector.
 * Enum values map to SystemVerilog `typedef enum logic [1:0]`.
 */
enum BlinkPattern {
  ALL_ON = 0,
  ALTERNATE = 1,
  CHASE = 2,
  OFF = 3,
}

/**
 * 6-LED blinker with button-cycled patterns.
 *
 * Hardware behavior:
 *  - 24-bit counter at 27 MHz wraps every ~0.62s (visible blink rate)
 *  - Button press (active-low) cycles through 4 patterns
 *  - SVA assertion guards chase_pos stays in range 0..5
 */
@Module
class Blinker extends HardwareModule {
  // ── Ports ───────────────────────────────────────────────
  @Input  clk:   Bit      = 0;
  @Input  rst_n: Bit      = 0;
  @Input  btn:   Bit      = 0;
  @Output led:   Logic<6> = 0;

  // ── Internal registers ──────────────────────────────────
  private counter:     Logic<24> = 0;
  private pattern_sel: Logic<2>  = 0;
  private chase_pos:   Logic<3>  = 0;

  /**
   * Clocked logic: counter, pattern selector, chase position.
   * All assignments compile to non-blocking (`<=`) in SystemVerilog.
   */
  @Sequential('clk')
  tick(): void {
    Assert(this.chase_pos < 6, 'chase position overflow');

    this.counter++;

    // Chase position advances each time the 24-bit counter wraps
    if (this.counter === 0) {
      this.chase_pos++;
      if (this.chase_pos === 6) {
        this.chase_pos = 0;
      }
    }

    // Button S2 is active-low with pull-up
    if (this.btn === 0) {
      this.pattern_sel = this.pattern_sel + 1;
    }
  }

  /**
   * Combinational output mux: pattern_sel drives LED output.
   * All assignments compile to blocking (`=`) in SystemVerilog.
   */
  @Combinational
  drive(): void {
    switch (this.pattern_sel) {
      case BlinkPattern.ALL_ON:
        this.led = 0x3f;
        break;

      case BlinkPattern.ALTERNATE:
        // Toggle between 0b101010 and 0b010101 at ~1.6 Hz
        if (((this.counter >> 23) & 1) === 1) {
          this.led = 0x2a;
        } else {
          this.led = 0x15;
        }
        break;

      case BlinkPattern.CHASE:
        this.led = 1 << this.chase_pos;
        break;

      default:
        this.led = 0;
        break;
    }
  }
}

// Export for testing
export { Blinker, BlinkPattern };
