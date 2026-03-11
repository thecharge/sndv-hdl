// Tang Nano 20K reset/debug visibility example
// Use this when checking reset wiring and post-flash behavior after power cycle.

import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
} from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class TangNano20kResetDebug extends HardwareModule {
  @Input clk: Bit = 0;
  @Input rst_n: Bit = 0;
  @Input btn: Bit = 1;
  @Output led: Logic<6> = 0x3f;

  private ticks: Logic<24> = 0;
  private alive: Bit = 0;

  @Sequential('clk')
  tick(): void {
    if (this.rst_n === 0) {
      this.ticks = 0;
      this.alive = 0;
      this.led = 0x3e;
      return;
    }

    this.ticks = this.ticks + 1;
    if (this.ticks === 0) {
      this.alive = this.alive ^ 1;
    }

    // Active-low indicators:
    // LED0: reset asserted, LED1: heartbeat, LED5: button pressed.
    this.led = 0x3f;
    if (this.alive === 1) {
      this.led = this.led & 0x3d;
    }
    if (this.btn === 0) {
      this.led = this.led & 0x1f;
    }
  }
}

export { TangNano20kResetDebug };
