// USB-JTAG proof example for Tang Nano 20K
// Purpose: provide a clean compile/flash target after migration cleanup.

import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
  Combinational,
} from '../../src/runtime';
import type { Bit, Logic } from '../../src/runtime';

@Module
class UsbJtagProbeBlinker extends HardwareModule {
  @Input clk: Bit = 0;
  @Input rst_n: Bit = 0;
  @Input btn: Bit = 1;
  @Output led: Logic<6> = 0;

  private counter: Logic<24> = 0;
  private phase: Logic<3> = 0;

  @Sequential('clk')
  tick(): void {
    if (this.rst_n === 0) {
      this.counter = 0;
      this.phase = 0;
      return;
    }

    this.counter++;
    if (this.counter === 0) {
      this.phase = this.phase + 1;
      if (this.phase === 6) {
        this.phase = 0;
      }
    }

    // Active-low button can hold LEDs off during board interaction.
    if (this.btn === 0) {
      this.phase = 0;
    }
  }

  @Combinational
  drive(): void {
    if (this.btn === 0) {
      this.led = 0;
    } else {
      this.led = 1 << this.phase;
    }
  }
}

export { UsbJtagProbeBlinker };
