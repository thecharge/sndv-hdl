// Tang Nano 20K single-LED bring-up: force LED0 ON (active-low).

import { HardwareModule, Module, Output, Combinational } from '@ts2v/runtime';
import type { Bit } from '@ts2v/runtime';

@Module
class SolidLed0On extends HardwareModule {
  @Output led: Bit = 0;

  @Combinational
  drive(): void {
    this.led = 0;
  }
}

export { SolidLed0On };
