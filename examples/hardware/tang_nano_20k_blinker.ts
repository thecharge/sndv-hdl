// Tang Nano 20K deterministic blinker.
// Active-low LEDs: 0 = on, 1 = off.
// This demo intentionally depends only on clk to avoid reset/button bring-up traps.

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
  @Output led: Logic<6> = 0x3f;

  private counter: Logic<25> = 0;
  private phase: Logic<3> = 0;

  @Sequential('clk')
  tick(): void {
    this.counter = this.counter + 1;
    if (this.counter === 0) {
      if (this.phase === 5) {
        this.phase = 0;
      } else {
        this.phase = this.phase + 1;
      }

      if (this.phase === 0) {
        this.led = 0x3e;
      } else if (this.phase === 1) {
        this.led = 0x3d;
      } else if (this.phase === 2) {
        this.led = 0x3b;
      } else if (this.phase === 3) {
        this.led = 0x37;
      } else if (this.phase === 4) {
        this.led = 0x2f;
      } else {
        this.led = 0x1f;
      }
    }
  }
}

export { Blinker };
