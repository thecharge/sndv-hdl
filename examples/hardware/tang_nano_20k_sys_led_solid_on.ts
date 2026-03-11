// Tang Nano 20K SYS LED solid-on smoke test.
// Active-low LEDs with pull-ups:
// - 0 turns LED on
// - 1 turns LED off
//
// This test is intentionally clock-independent.
// If this image is flashed and booted, all SYS LEDs should light.

import { HardwareModule, Module, Output } from '@ts2v/runtime';
import type { Logic } from '@ts2v/runtime';

@Module
class SysLedSolidOn extends HardwareModule {
  @Output led: Logic<6> = 0x00;
}

export { SysLedSolidOn };
