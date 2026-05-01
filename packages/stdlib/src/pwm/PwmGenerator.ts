import { HardwareModule, Input, Module, ModuleConfig, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const PWM_PERIOD = 1000;
const PWM_DEFAULT_DUTY = 500;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class PwmGenerator extends HardwareModule {
  @Input clk: Bit = 0;
  @Input duty: Logic<16> = PWM_DEFAULT_DUTY;
  @Output pwm_out: Bit = 0;

  private counter: Logic<16> = 0;

  @Sequential('clk')
  tick(): void {
    if (this.counter >= PWM_PERIOD - 1) {
      this.counter = 0;
    } else {
      this.counter = this.counter + 1;
    }
    if (this.counter < this.duty) {
      this.pwm_out = 1;
    } else {
      this.pwm_out = 0;
    }
  }
}

export { PwmGenerator };
