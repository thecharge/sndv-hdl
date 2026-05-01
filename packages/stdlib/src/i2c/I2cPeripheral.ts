import { HardwareModule, Input, Module, ModuleConfig, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum I2cPeriSt {
  I2CP_IDLE = 0,
  I2CP_ADDR = 1,
  I2CP_ADDR_ACK = 2,
  I2CP_DATA = 3,
  I2CP_DATA_ACK = 4,
}

@Module
@ModuleConfig('resetSignal: "no_rst"')
class I2cPeripheral extends HardwareModule {
  @Input clk: Bit = 0;
  @Input my_addr: Logic<7> = 0x55;
  @Input scl: Bit = 1;
  @Input sda_in: Bit = 1;
  @Input tx_data: Logic<8> = 0;
  @Output sda_out: Bit = 1;
  @Output sda_oe: Bit = 0;
  @Output rx_data: Logic<8> = 0;
  @Output rx_valid: Bit = 0;
  @Output addressed: Bit = 0;
  @Output rw: Bit = 0;

  private state: Logic<3> = I2cPeriSt.I2CP_IDLE;
  private bit_cnt: Logic<4> = 0;
  private shift: Logic<8> = 0;
  private scl_prev: Bit = 1;
  private sda_prev: Bit = 1;

  @Sequential('clk')
  tick(): void {
    this.rx_valid = 0;
    this.scl_prev = this.scl;
    this.sda_prev = this.sda_in;

    // Detect START condition: SDA falls while SCL is high
    if (this.scl === 1 && this.scl_prev === 1 && this.sda_in === 0 && this.sda_prev === 1) {
      this.state = I2cPeriSt.I2CP_ADDR;
      this.bit_cnt = 7;
      this.shift = 0;
    }

    // Detect STOP condition
    if (this.scl === 1 && this.scl_prev === 1 && this.sda_in === 1 && this.sda_prev === 0) {
      this.state = I2cPeriSt.I2CP_IDLE;
      this.addressed = 0;
      this.sda_oe = 0;
    }

    // Sample data on SCL rising edge
    if (this.scl === 1 && this.scl_prev === 0) {
      switch (this.state) {
        case I2cPeriSt.I2CP_ADDR: {
          this.shift = (this.shift << 1) | (this.sda_in & 1);
          if (this.bit_cnt === 0) {
            this.rw = this.shift & 1;
            if (this.shift >> 1 === this.my_addr) {
              this.addressed = 1;
            } else {
              this.addressed = 0;
            }
            this.state = I2cPeriSt.I2CP_ADDR_ACK;
          } else {
            this.bit_cnt = this.bit_cnt - 1;
          }
          break;
        }
        case I2cPeriSt.I2CP_DATA: {
          this.shift = (this.shift << 1) | (this.sda_in & 1);
          if (this.bit_cnt === 0) {
            this.rx_data = this.shift;
            this.rx_valid = 1;
            this.state = I2cPeriSt.I2CP_DATA_ACK;
          } else {
            this.bit_cnt = this.bit_cnt - 1;
          }
          break;
        }
        default: {
          break;
        }
      }
    }

    // Drive SDA on SCL falling edge
    if (this.scl === 0 && this.scl_prev === 1) {
      switch (this.state) {
        case I2cPeriSt.I2CP_ADDR_ACK: {
          if (this.addressed === 1) {
            this.sda_oe = 1;
            this.sda_out = 0;
          } else {
            this.sda_oe = 0;
          }
          this.state = I2cPeriSt.I2CP_DATA;
          this.bit_cnt = 7;
          this.shift = 0;
          break;
        }
        case I2cPeriSt.I2CP_DATA_ACK: {
          this.sda_oe = 1;
          this.sda_out = 0;
          this.state = I2cPeriSt.I2CP_DATA;
          this.bit_cnt = 7;
          break;
        }
        default: {
          this.sda_oe = 0;
          break;
        }
      }
    }
  }
}

export { I2cPeripheral };
