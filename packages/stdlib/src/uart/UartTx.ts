import { HardwareModule, Input, Module, ModuleConfig, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const UART_BIT_PERIOD = 234;

enum TxState {
  TX_IDLE = 0,
  TX_START = 1,
  TX_DATA = 2,
  TX_STOP = 3,
}

@Module
@ModuleConfig('resetSignal: "no_rst"')
class UartTx extends HardwareModule {
  @Input clk: Bit = 0;
  @Input tx_valid: Bit = 0;
  @Input tx_data: Logic<8> = 0;
  @Output tx: Bit = 1;
  @Output tx_ready: Bit = 1;

  private state: Logic<2> = TxState.TX_IDLE;
  private bit_cnt: Logic<4> = 0;
  private baud_cnt: Logic<8> = 0;
  private shift: Logic<8> = 0;

  @Sequential('clk')
  tick(): void {
    switch (this.state) {
      case TxState.TX_IDLE: {
        this.tx = 1;
        this.tx_ready = 1;
        if (this.tx_valid === 1) {
          this.shift = this.tx_data;
          this.state = TxState.TX_START;
          this.baud_cnt = 0;
          this.tx_ready = 0;
        }
        break;
      }
      case TxState.TX_START: {
        this.tx = 0;
        if (this.baud_cnt >= UART_BIT_PERIOD - 1) {
          this.baud_cnt = 0;
          this.bit_cnt = 0;
          this.state = TxState.TX_DATA;
        } else {
          this.baud_cnt = this.baud_cnt + 1;
        }
        break;
      }
      case TxState.TX_DATA: {
        this.tx = this.shift & 1;
        if (this.baud_cnt >= UART_BIT_PERIOD - 1) {
          this.baud_cnt = 0;
          this.shift = this.shift >> 1;
          if (this.bit_cnt >= 7) {
            this.state = TxState.TX_STOP;
          } else {
            this.bit_cnt = this.bit_cnt + 1;
          }
        } else {
          this.baud_cnt = this.baud_cnt + 1;
        }
        break;
      }
      case TxState.TX_STOP: {
        this.tx = 1;
        if (this.baud_cnt >= UART_BIT_PERIOD - 1) {
          this.baud_cnt = 0;
          this.state = TxState.TX_IDLE;
        } else {
          this.baud_cnt = this.baud_cnt + 1;
        }
        break;
      }
      default: {
        this.state = TxState.TX_IDLE;
        break;
      }
    }
  }
}

export { UartTx };
