import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
} from '@ts2v/runtime';
import type { Bit, LogicArray } from '@ts2v/runtime';

@Module
class ShiftRegister extends HardwareModule {
  @Input  clk:       Bit = 0;
  @Input  serial_in: Bit = 0;
  @Output serial_out: Bit = 0;

  private shift_reg: LogicArray<1, 8> = [];

  @Sequential('clk')
  tick(): void {
    this.serial_out = this.shift_reg[0];
    this.shift_reg[0] = this.shift_reg[1];
    this.shift_reg[1] = this.shift_reg[2];
    this.shift_reg[2] = this.shift_reg[3];
    this.shift_reg[3] = this.shift_reg[4];
    this.shift_reg[4] = this.shift_reg[5];
    this.shift_reg[5] = this.shift_reg[6];
    this.shift_reg[6] = this.shift_reg[7];
    this.shift_reg[7] = this.serial_in;
  }
}

export { ShiftRegister };
