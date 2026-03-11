// Tang Nano 20K UART debug pulse example
// Emits a slow UART-like start/data/stop framing pattern for pin-level debugging.

import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
} from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class TangNano20kUartDebug extends HardwareModule {
  @Input clk: Bit = 0;
  @Input rst_n: Bit = 0;
  @Output uart_tx: Bit = 1;
  @Output led: Logic<6> = 0x3f;

  private baudDiv: Logic<16> = 0;
  private bitIndex: Logic<4> = 0;
  private frame: Logic<10> = 0x3ff;

  @Sequential('clk')
  tick(): void {
    if (this.rst_n === 0) {
      this.baudDiv = 0;
      this.bitIndex = 0;
      this.frame = 0x3ff;
      this.uart_tx = 1;
      this.led = 0x3f;
      return;
    }

    this.baudDiv = this.baudDiv + 1;
    if (this.baudDiv === 0) {
      this.bitIndex = this.bitIndex + 1;
      if (this.bitIndex === 10) {
        this.bitIndex = 0;
        // Start=0, data=0x55, stop=1.
        this.frame = 0b1010101010;
      }
    }

    this.uart_tx = (this.frame >> this.bitIndex) & 1;

    switch (this.bitIndex) {
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

export { TangNano20kUartDebug };
