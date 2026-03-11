// Tang Nano 20K WS2812-only demo.
// No onboard LED output: this image drives only the ws2812 pin.

import { HardwareModule, Module, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class Ws2812Only extends HardwareModule {
  @Input clk: Bit = 0;
  @Output ws2812: Bit = 0;

  // 27MHz timing (approx)
  private readonly t1h: Logic<6> = 19;
  private readonly t0h: Logic<6> = 10;
  private readonly tbit: Logic<6> = 34;
  private readonly treset: Logic<12> = 1600;

  // Full-brightness GRB cycle to make strip response obvious.
  private frame: Logic<24> = 0x00ff00;
  private colorIndex: Logic<2> = 0;
  private bitIndex: Logic<5> = 0;
  private tickInBit: Logic<6> = 0;
  private resetTicks: Logic<12> = 0;
  private sending: Bit = 0;

  @Sequential('clk')
  tick(): void {
    if (this.sending === 0) {
      this.ws2812 = 0;
      this.resetTicks = this.resetTicks + 1;
      if (this.resetTicks >= this.treset) {
        this.resetTicks = 0;
        this.sending = 1;
        this.bitIndex = 0;
        this.tickInBit = 0;

        if (this.colorIndex === 0) {
          this.frame = 0x00ff00;
        } else if (this.colorIndex === 1) {
          this.frame = 0xff0000;
        } else if (this.colorIndex === 2) {
          this.frame = 0x0000ff;
        } else {
          this.frame = 0x808080;
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

export { Ws2812Only };
