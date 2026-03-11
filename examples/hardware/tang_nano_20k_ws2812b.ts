// Tang Nano 20K WS2812B practical demo.
// - Drives one WS2812 pixel stream with timing derived for 27MHz clock.
// - Also updates onboard active-low LEDs as a heartbeat so bring-up is visible
//   even before attaching a strip/probe.

import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
} from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class Ws2812bDemo extends HardwareModule {
  @Input clk: Bit = 0;
  @Output ws2812: Bit = 0;
  @Output led: Logic<6> = 0x3f;

  // Bit timing for 27MHz clock (~37ns):
  // 1-bit high: 19 cycles (~0.70us), 0-bit high: 10 cycles (~0.37us), total bit: 34 cycles (~1.26us)
  private readonly t1h: Logic<6> = 19;
  private readonly t0h: Logic<6> = 10;
  private readonly tbit: Logic<6> = 34;
  private readonly treset: Logic<12> = 1600;

  private frame: Logic<24> = 0x001000;
  private colorIndex: Logic<2> = 0;
  private bitIndex: Logic<5> = 0;
  private tickInBit: Logic<6> = 0;
  private resetTicks: Logic<12> = 0;
  private sending: Bit = 0;

  private ledHeartbeat: Logic<24> = 0;

  @Sequential('clk')
  tick(): void {
    this.ledHeartbeat = this.ledHeartbeat + 1;
    if ((this.ledHeartbeat & 0x7fffff) === 0) {
      if (this.led === 0x3f) {
        this.led = 0x3e;
      } else {
        this.led = 0x3f;
      }
    }

    if (this.sending === 0) {
      this.ws2812 = 0;
      this.resetTicks = this.resetTicks + 1;
      if (this.resetTicks >= this.treset) {
        this.resetTicks = 0;
        this.sending = 1;
        this.bitIndex = 0;
        this.tickInBit = 0;

        if (this.colorIndex === 0) {
          this.frame = 0x001000;
        } else if (this.colorIndex === 1) {
          this.frame = 0x100000;
        } else if (this.colorIndex === 2) {
          this.frame = 0x000010;
        } else {
          this.frame = 0x080808;
        }
      }
    } else {
      const bitValue = (this.frame >> (23 - this.bitIndex)) & 1;
      let highTicks = this.t0h;
      if (bitValue === 1) {
        highTicks = this.t1h;
      }

      if (this.tickInBit < highTicks) {
        this.ws2812 = 1;
      } else {
        this.ws2812 = 0;
      }

      this.tickInBit = this.tickInBit + 1;
      if (this.tickInBit >= this.tbit) {
        this.tickInBit = 0;
        this.bitIndex = this.bitIndex + 1;
        if (this.bitIndex >= 24) {
          this.sending = 0;
          this.bitIndex = 0;
          if (this.colorIndex === 3) {
            this.colorIndex = 0;
          } else {
            this.colorIndex = this.colorIndex + 1;
          }
        }
      }
    }
  }
}

export { Ws2812bDemo };
