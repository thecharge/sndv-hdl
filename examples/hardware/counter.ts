// Minimal counter — ts2v v1.0.0
// The simplest possible sequential module: an 8-bit up-counter.
// Valid TypeScript — passes tsc --strict

import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
} from '@ts2v/runtime';
import type { Logic, Bit } from '@ts2v/runtime';

@Module
class Counter extends HardwareModule {
  @Input  clk:   Bit      = 0;
  @Input  rst_n: Bit      = 0;
  @Output count: Logic<8> = 0;

  @Sequential('clk')
  tick(): void {
    this.count = this.count + 1;
  }
}

export { Counter };
