// USB-JTAG proof example for Tang Nano 20K.
// This keeps behavior obvious during probe/flash troubleshooting.

import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
} from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class UsbJtagProbeBlinker extends HardwareModule {
  @Input clk: Bit = 0;
  @Input rst_n: Bit = 0;
  @Input btn: Bit = 1;
  @Output led: Logic<6> = 0x3f;

  private counter: Logic<24> = 0;
  private phase: Logic<3> = 0;

  @Sequential('clk')
  tick(): void {
    if (this.rst_n === 0) {
      this.counter = 0;
      this.phase = 0;
      this.led = 0x3f;
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

    if (this.btn === 0) {
      this.led = 0x3f;
    } else {
      // Active-low walking LED: clear one bit at a time.
      switch (this.phase) {
        case 0:
          this.led = 0x3e;
          break;
        case 1:
          this.led = 0x3d;
          break;
        case 2:
          this.led = 0x3b;
          break;
        case 3:
          this.led = 0x37;
          break;
        case 4:
          this.led = 0x2f;
          break;
        default:
          this.led = 0x1f;
          break;
      }
    }
  }
}

export { UsbJtagProbeBlinker };
