// Tang Nano 20K clockless SYS LED probe.
// Uses only button input and active-low SYS LEDs.
//
// Behavior:
// - button released (btn=1, pull-up): all LEDs off (0x3f)
// - button pressed  (btn=0): all LEDs on  (0x00)

import { Combinational, HardwareModule, Input, Module, Output } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class SysLedButtonProbe extends HardwareModule {
  @Input btn: Bit = 1;
  @Output led: Logic<6> = 0x3f;

  @Combinational
  driveLeds(): void {
    if (this.btn === 0) {
      this.led = 0x00;
    } else {
      this.led = 0x3f;
    }
  }
}

export { SysLedButtonProbe };
