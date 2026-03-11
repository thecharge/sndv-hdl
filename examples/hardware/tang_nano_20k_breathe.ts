// Tang Nano 20K Breathing LED — ts2v v1.0.0 hierarchy demo
// Valid TypeScript — passes tsc --strict with experimentalDecorators
//
// Demonstrates: @Submodule instantiation, two-module compilation
// Target: Sipeed Tang Nano 20K (GW2AR-18C, 27 MHz crystal)

import {
  HardwareModule,
  Module,
  Input,
  Output,
  Submodule,
  Sequential,
  Combinational,
} from '../../src/runtime';
import type { Logic, Bit } from '../../src/runtime';

/**
 * 8-bit PWM core. Generates a pulse-width modulated output.
 * Compiles to its own SystemVerilog module.
 */
@Module
class PwmCore extends HardwareModule {
  @Input  clk:     Bit      = 0;
  @Input  rst_n:   Bit      = 0;
  @Input  duty:    Logic<8> = 0;
  @Output pwm_out: Bit      = 0;

  private counter: Logic<8> = 0;

  @Sequential('clk')
  count(): void {
    this.counter++;
  }

  @Combinational
  compare(): void {
    if (this.counter < this.duty) {
      this.pwm_out = 1;
    } else {
      this.pwm_out = 0;
    }
  }
}

/**
 * Breathing LED controller.
 * Ramps duty cycle up/down to create a "breathing" effect.
 * Instantiates PwmCore as a submodule.
 */
@Module
class BreatheLed extends HardwareModule {
  @Input  clk:   Bit = 0;
  @Input  rst_n: Bit = 0;
  @Output led:   Bit = 0;

  private duty:      Logic<8>  = 0;
  private prescaler: Logic<16> = 0;
  private direction: Bit       = 0;

  /** Submodule: instantiates PwmCore with auto-bound ports */
  @Submodule pwm: PwmCore = new PwmCore();

  @Sequential('clk')
  ramp(): void {
    this.prescaler++;

    // Advance duty cycle each time prescaler wraps (~410 Hz at 27 MHz)
    if (this.prescaler === 0) {
      if (this.direction === 0) {
        this.duty++;
        if (this.duty === 255) {
          this.direction = 1;
        }
      } else {
        this.duty--;
        if (this.duty === 0) {
          this.direction = 0;
        }
      }
    }
  }
}

export { PwmCore, BreatheLed };
