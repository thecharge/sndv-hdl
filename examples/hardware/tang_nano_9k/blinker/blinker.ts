import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
} from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const ALL_LEDS_OFF = 0xf;

@Module
class Blinker extends HardwareModule {
  @Input  clk: Bit = 0;
  @Output led: Logic<4> = ALL_LEDS_OFF;

  private counter: Logic<25> = 0;
  private phase:   Logic<3>  = 0;

  @Sequential('clk')
  tick(): void {
    this.counter = this.counter + 1;
    if (this.counter === 0) {
      if (this.phase === 3) {
        this.phase = 0;
      } else {
        this.phase = this.phase + 1;
      }

      if (this.phase === 0) {
        this.led = 0xe;
      } else if (this.phase === 1) {
        this.led = 0xd;
      } else if (this.phase === 2) {
        this.led = 0xb;
      } else {
        this.led = 0x7;
      }
    }
  }
}

export { Blinker };
