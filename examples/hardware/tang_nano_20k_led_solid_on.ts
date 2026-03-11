// Tang Nano 20K bring-up image: force all active-low LEDs ON.

import { HardwareModule, Module, Output, Combinational } from '@ts2v/runtime';
import type { Logic } from '@ts2v/runtime';

@Module
class SolidLedOn extends HardwareModule {
  @Output led: Logic<6> = 0;

  @Combinational
  drive(): void {
    this.led = 0;
  }
}

export { SolidLedOn };
