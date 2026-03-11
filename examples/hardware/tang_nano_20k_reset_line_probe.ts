// Tang Nano 20K reset-line probe (clockless).
// If rst_n is high, LEDs are OFF (0x3f).
// If rst_n is low, LEDs are ON  (0x00).
//
// This isolates reset wiring/pin mapping from clock behavior.

import { Combinational, HardwareModule, Input, Module, Output } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class ResetLineProbe extends HardwareModule {
  @Input rst_n: Bit = 1;
  @Output led: Logic<6> = 0x3f;

  @Combinational
  drive(): void {
    if (this.rst_n === 0) {
      this.led = 0x00;
    } else {
      this.led = 0x3f;
    }
  }
}

export { ResetLineProbe };
