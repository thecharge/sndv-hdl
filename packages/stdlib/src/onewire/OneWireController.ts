import { HardwareModule, Input, Module, ModuleConfig, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// 1-Wire controller at 27MHz
// Timing (standard speed):
//   Reset pulse:    480us -> 12960 clocks
//   Presence window: 60us -> 1620 clocks (sample at 70us = 1890 clocks)
//   Write-1 / Read sample: 6us low + 9us float -> 162+243 clocks
//   Write-0 high: 60us low -> 1620 clocks; release 10us -> 270 clocks
//   Bit period: 70us = 1890 clocks

const OW_RESET_LOW = 12960;
const OW_RESET_SAMPLE = 1890;
const OW_RESET_RECOV = 1890;
const OW_WRITE1_LOW = 162;
const OW_WRITE0_LOW = 1620;
const OW_BIT_PERIOD = 1890;
const OW_READ_SAMPLE = 270;

enum OwSt {
  OW_IDLE = 0,
  OW_RESET_PULL = 1,
  OW_PRESENCE_WAIT = 2,
  OW_PRESENCE_SAMPLE = 3,
  OW_PRESENCE_RECOV = 4,
  OW_BIT_LOW = 5,
  OW_BIT_HIGH = 6,
  OW_DONE = 7,
}

enum OwCmd {
  OW_CMD_IDLE = 0,
  OW_CMD_RESET = 1,
  OW_CMD_WRITE = 2,
  OW_CMD_READ = 3,
}

@Module
@ModuleConfig('resetSignal: "no_rst"')
class OneWireController extends HardwareModule {
  @Input clk: Bit = 0;
  @Input cmd: Logic<2> = OwCmd.OW_CMD_IDLE;
  @Input tx_data: Logic<8> = 0;
  @Output ow_out: Bit = 1;
  @Output ow_oe: Bit = 0;
  @Output rx_data: Logic<8> = 0;
  @Output presence: Bit = 0;
  @Output done: Bit = 0;
  @Input ow_in: Bit = 1;

  private state: Logic<3> = OwSt.OW_IDLE;
  private timer: Logic<15> = 0;
  private bit_cnt: Logic<4> = 0;
  private shift: Logic<8> = 0;
  private cur_cmd: Logic<2> = OwCmd.OW_CMD_IDLE;
  private write_bit: Bit = 0;

  @Sequential('clk')
  tick(): void {
    this.done = 0;
    switch (this.state) {
      case OwSt.OW_IDLE: {
        this.ow_oe = 0;
        this.ow_out = 1;
        if (this.cmd === OwCmd.OW_CMD_RESET) {
          this.cur_cmd = OwCmd.OW_CMD_RESET;
          this.state = OwSt.OW_RESET_PULL;
          this.ow_oe = 1;
          this.ow_out = 0;
          this.timer = 0;
        }
        if (this.cmd === OwCmd.OW_CMD_WRITE) {
          this.cur_cmd = OwCmd.OW_CMD_WRITE;
          this.shift = this.tx_data;
          this.bit_cnt = 7;
          this.write_bit = this.tx_data & 1;
          this.state = OwSt.OW_BIT_LOW;
          this.ow_oe = 1;
          this.ow_out = 0;
          this.timer = 0;
        }
        if (this.cmd === OwCmd.OW_CMD_READ) {
          this.cur_cmd = OwCmd.OW_CMD_READ;
          this.shift = 0;
          this.bit_cnt = 7;
          this.state = OwSt.OW_BIT_LOW;
          this.ow_oe = 1;
          this.ow_out = 0;
          this.timer = 0;
        }
        break;
      }
      case OwSt.OW_RESET_PULL: {
        this.timer = this.timer + 1;
        if (this.timer >= OW_RESET_LOW) {
          this.ow_oe = 0;
          this.ow_out = 1;
          this.timer = 0;
          this.state = OwSt.OW_PRESENCE_WAIT;
        }
        break;
      }
      case OwSt.OW_PRESENCE_WAIT: {
        this.timer = this.timer + 1;
        if (this.timer >= OW_RESET_SAMPLE) {
          this.presence = this.ow_in ^ 1;
          this.state = OwSt.OW_PRESENCE_RECOV;
          this.timer = 0;
        }
        break;
      }
      case OwSt.OW_PRESENCE_RECOV: {
        this.timer = this.timer + 1;
        if (this.timer >= OW_RESET_RECOV) {
          this.done = 1;
          this.state = OwSt.OW_IDLE;
        }
        break;
      }
      case OwSt.OW_BIT_LOW: {
        this.timer = this.timer + 1;
        if (this.cur_cmd === OwCmd.OW_CMD_WRITE) {
          if (this.write_bit === 0) {
            if (this.timer >= OW_WRITE0_LOW) {
              this.ow_oe = 0;
              this.ow_out = 1;
              this.state = OwSt.OW_BIT_HIGH;
              this.timer = 0;
            }
          } else {
            if (this.timer >= OW_WRITE1_LOW) {
              this.ow_oe = 0;
              this.ow_out = 1;
              this.state = OwSt.OW_BIT_HIGH;
              this.timer = 0;
            }
          }
        } else {
          if (this.timer >= OW_WRITE1_LOW) {
            this.ow_oe = 0;
            this.ow_out = 1;
            this.state = OwSt.OW_BIT_HIGH;
            this.timer = 0;
          }
        }
        break;
      }
      case OwSt.OW_BIT_HIGH: {
        this.timer = this.timer + 1;
        if (this.cur_cmd === OwCmd.OW_CMD_READ) {
          if (this.timer === OW_READ_SAMPLE) {
            this.shift = (this.shift >> 1) | ((this.ow_in & 1) << 7);
          }
        }
        if (this.timer >= OW_BIT_PERIOD) {
          this.timer = 0;
          if (this.bit_cnt === 0) {
            if (this.cur_cmd === OwCmd.OW_CMD_READ) {
              this.rx_data = this.shift;
            }
            this.done = 1;
            this.state = OwSt.OW_IDLE;
          } else {
            this.bit_cnt = this.bit_cnt - 1;
            if (this.cur_cmd === OwCmd.OW_CMD_WRITE) {
              this.shift = this.shift >> 1;
              this.write_bit = this.shift & 1;
            }
            this.ow_oe = 1;
            this.ow_out = 0;
            this.state = OwSt.OW_BIT_LOW;
          }
        }
        break;
      }
      default: {
        this.state = OwSt.OW_IDLE;
        break;
      }
    }
  }
}

export { OneWireController };
