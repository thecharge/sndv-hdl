// Tang Nano 20K WS2812B demo signal generator
// This example emits a simple, periodic pulse train on `ws2812`.

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
class Ws2812bDemo extends HardwareModule {
  @Input clk: Bit = 0;
  @Input rst_n: Bit = 0;
  @Output ws2812: Bit = 0;
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
      this.phase++;
      if (this.phase === 6) {
        this.phase = 0;
      }
    }
  }

  @Combinational
  drive(): void {
    // Demo pulse pattern suitable for probing the WS2812 output pin.
    if (((this.counter >> 5) & 1) === 1) {
      this.ws2812 = 1;
    } else {
      this.ws2812 = 0;
    }

    this.led = 1 << this.phase;
  }
}

export { Ws2812bDemo };
