// Tang Nano 20K SYS LED blinker (active-low LEDs).
// Board pins:
// - PIN15_SYS_LED0 -> led[0]
// - PIN16_SYS_LED1 -> led[1]
// - PIN17_SYS_LED2 -> led[2]
// - PIN18_SYS_LED3 -> led[3]
// - PIN19_SYS_LED4 -> led[4]
// - PIN20_SYS_LED5 -> led[5]
//
// LEDs are pulled up by default on this board, so:
// - 1 means off
// - 0 means on

import { HardwareModule, Module, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class SysLedBlinker extends HardwareModule {
  @Input clk: Bit = 0;
  @Output led: Logic<6> = 0x3f;

  // 24-bit overflow at 27MHz gives a human-visible step rate.
  private counter: Logic<24> = 0;
  private ledIndex: Logic<3> = 0;

  @Sequential('clk')
  tick(): void {
    this.counter = this.counter + 1;

    if (this.counter === 0) {
      if (this.ledIndex === 0) {
        this.led = 0x3e;
      } else if (this.ledIndex === 1) {
        this.led = 0x3d;
      } else if (this.ledIndex === 2) {
        this.led = 0x3b;
      } else if (this.ledIndex === 3) {
        this.led = 0x37;
      } else if (this.ledIndex === 4) {
        this.led = 0x2f;
      } else {
        this.led = 0x1f;
      }

      if (this.ledIndex === 5) {
        this.ledIndex = 0;
      } else {
        this.ledIndex = this.ledIndex + 1;
      }
    }
  }
}

export { SysLedBlinker };
