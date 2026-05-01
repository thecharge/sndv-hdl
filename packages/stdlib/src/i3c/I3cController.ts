import { HardwareModule, Input, Module, ModuleConfig, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// I3C controller with I2C-compatible fallback.
// Basic CCC (Common Command Code) support.
const I3C_CLK_DIV = 54; // ~500kHz at 27MHz

enum I3cCtrlSt {
  I3C_IDLE = 0,
  I3C_START = 1,
  I3C_ADDR = 2,
  I3C_ACK = 3,
  I3C_CCC = 4,
  I3C_DATA = 5,
  I3C_STOP = 6,
}

@Module
@ModuleConfig('resetSignal: "no_rst"')
class I3cController extends HardwareModule {
  @Input clk: Bit = 0;
  @Input start: Bit = 0;
  @Input ccc_cmd: Logic<8> = 0;
  @Input addr: Logic<7> = 0;
  @Input rw: Bit = 0;
  @Input tx_data: Logic<8> = 0;
  @Input sda_in: Bit = 1;
  @Output scl: Bit = 1;
  @Output sda_out: Bit = 1;
  @Output sda_oe: Bit = 0;
  @Output rx_data: Logic<8> = 0;
  @Output done: Bit = 0;

  private state: Logic<3> = I3cCtrlSt.I3C_IDLE;
  private bit_cnt: Logic<4> = 0;
  private clk_cnt: Logic<8> = 0;
  private shift: Logic<8> = 0;

  @Sequential('clk')
  tick(): void {
    this.done = 0;
    if (this.clk_cnt < I3C_CLK_DIV - 1) {
      this.clk_cnt = this.clk_cnt + 1;
    } else {
      this.clk_cnt = 0;
      switch (this.state) {
        case I3cCtrlSt.I3C_IDLE: {
          this.scl = 1;
          this.sda_out = 1;
          this.sda_oe = 0;
          if (this.start === 1) {
            this.state = I3cCtrlSt.I3C_START;
          }
          break;
        }
        case I3cCtrlSt.I3C_START: {
          this.sda_oe = 1;
          this.sda_out = 0;
          this.scl = 0;
          if (this.ccc_cmd !== 0) {
            this.shift = this.ccc_cmd;
            this.state = I3cCtrlSt.I3C_CCC;
          } else {
            this.shift = (this.addr << 1) | (this.rw & 1);
            this.state = I3cCtrlSt.I3C_ADDR;
          }
          this.bit_cnt = 7;
          break;
        }
        case I3cCtrlSt.I3C_ADDR:
        case I3cCtrlSt.I3C_CCC:
        case I3cCtrlSt.I3C_DATA: {
          this.scl = this.scl ^ 1;
          if (this.scl === 0) {
            if (this.bit_cnt === 0) {
              this.state = I3cCtrlSt.I3C_ACK;
            } else {
              this.sda_out = (this.shift >> 7) & 1;
              this.shift = this.shift << 1;
              this.bit_cnt = this.bit_cnt - 1;
            }
          }
          break;
        }
        case I3cCtrlSt.I3C_ACK: {
          this.scl = this.scl ^ 1;
          this.sda_oe = 0;
          if (this.scl === 0) {
            this.rx_data = this.sda_in & 0xff;
            this.done = 1;
            this.state = I3cCtrlSt.I3C_STOP;
            this.sda_oe = 1;
            this.sda_out = 0;
          }
          break;
        }
        case I3cCtrlSt.I3C_STOP: {
          this.scl = 1;
          this.sda_out = 1;
          this.sda_oe = 0;
          this.state = I3cCtrlSt.I3C_IDLE;
          break;
        }
        default: {
          this.state = I3cCtrlSt.I3C_IDLE;
          break;
        }
      }
    }
  }
}

export { I3cController };
