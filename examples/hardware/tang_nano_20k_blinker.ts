// Tang Nano 20K minimal blinker.
// LED pins on this board are active-low: 0 = LED on, 1 = LED off.

import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
} from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class Blinker extends HardwareModule {
  @Input clk: Bit = 0;
  @Input rst_n: Bit = 0;
  @Input btn: Bit = 1;
  @Output led: Logic<6> = 0x3f;

  private counter: Logic<24> = 0;
  private blink: Bit = 0;

  @Sequential('clk')
  tick(): void {
    if (this.rst_n === 0) {
      this.counter = 0;
      this.blink = 0;
      this.led = 0x3f;
      return;
    }

    this.counter = this.counter + 1;
    if (this.counter === 0) {
      this.blink = this.blink ^ 1;
    }

    if (this.btn === 0) {
      this.led = 0x3f;
      return;
    }

    if (this.blink === 1) {
      this.led = 0x3e;
    } else {
      this.led = 0x3f;
    }
  }
}

export { Blinker };
