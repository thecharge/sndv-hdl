import { HardwareModule, Input, Module, ModuleConfig, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
@ModuleConfig('resetSignal: "rst_n"')
class ClockDomainCrossing extends HardwareModule {
  @Input clk_dst: Bit = 0;
  @Input rst_n: Bit = 0;
  @Input d_in: Bit = 0;
  @Output d_out: Bit = 0;

  private meta: Logic<1> = 0;

  @Sequential('clk_dst')
  sync(): void {
    this.meta = this.d_in;
    this.d_out = this.meta;
  }
}

export { ClockDomainCrossing };
