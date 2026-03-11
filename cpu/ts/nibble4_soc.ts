// nibble4 Dual-Core SoC: Two 4-bit CPU cores with shared RAM, UART, LEDs
// Compiles to IEEE 1800-2017 SystemVerilog via ts2v
import { Module, Logic, Input, Output, Sequential, Combinational } from 'ts2sv';

// Bus arbiter: round-robin between 2 cores
class Nibble4Arbiter extends Module {
  @Input clk: Logic<1>;
  @Input rst_n: Logic<1>;
  @Input req_0: Logic<1>;
  @Input addr_0: Logic<8>;
  @Input wdata_0: Logic<4>;
  @Input wen_0: Logic<1>;
  @Input req_1: Logic<1>;
  @Input addr_1: Logic<8>;
  @Input wdata_1: Logic<4>;
  @Input wen_1: Logic<1>;

  @Output ack_0: Logic<1> = 0;
  @Output ack_1: Logic<1> = 0;
  @Output bus_addr: Logic<8> = 0;
  @Output bus_wdata: Logic<4> = 0;
  @Output bus_wen: Logic<1> = 0;
  @Output bus_valid: Logic<1> = 0;

  private priority: Logic<1> = 0;

  @Sequential(clk)
  arbitrate() {
    if (this.req_0 && (!this.req_1 || !this.priority)) {
      this.ack_0 = 1;
      this.ack_1 = 0;
      this.bus_addr = this.addr_0;
      this.bus_wdata = this.wdata_0;
      this.bus_wen = this.wen_0;
      this.bus_valid = 1;
      this.priority = 1;
    } else if (this.req_1) {
      this.ack_0 = 0;
      this.ack_1 = 1;
      this.bus_addr = this.addr_1;
      this.bus_wdata = this.wdata_1;
      this.bus_wen = this.wen_1;
      this.bus_valid = 1;
      this.priority = 0;
    } else {
      this.ack_0 = 0;
      this.ack_1 = 0;
      this.bus_valid = 0;
    }
  }
}

// Shared RAM + peripheral decoder
// 0x00-0xEF: RAM (240 nibbles)
// 0xF0: UART TX data
// 0xF1: UART status
// 0xF2: LED output
// 0xF3: Core ID
// 0xF4: Mutex
// 0xF5: Timer low
// 0xF6: Timer high
class Nibble4Memory extends Module {
  @Input clk: Logic<1>;
  @Input rst_n: Logic<1>;
  @Input addr: Logic<8>;
  @Input wdata: Logic<4>;
  @Input wen: Logic<1>;
  @Input valid: Logic<1>;
  @Input uart_busy: Logic<1>;

  @Output rdata: Logic<4> = 0;
  @Output uart_tx_data: Logic<4> = 0;
  @Output uart_tx_start: Logic<1> = 0;
  @Output led_out: Logic<4> = 0;

  private mutex_locked: Logic<1> = 0;
  private timer: Logic<8> = 0;

  @Sequential(clk)
  mem_logic() {
    this.uart_tx_start = 0;
    this.timer = this.timer + 1;

    if (this.valid) {
      if (this.addr < 0xF0) {
        if (this.wen) {
          // RAM write - handled by synthesis tool memory inference
        }
      } else {
        if (this.wen) {
          if (this.addr === 0xF0) {
            this.uart_tx_data = this.wdata;
            this.uart_tx_start = 1;
          } else if (this.addr === 0xF2) {
            this.led_out = this.wdata;
          } else if (this.addr === 0xF4) {
            this.mutex_locked = 0;
          }
        } else {
          if (this.addr === 0xF4) {
            if (!this.mutex_locked) {
              this.mutex_locked = 1;
            }
          }
        }
      }
    }
  }

  @Combinational
  read_mux() {
    if (this.addr < 0xF0) {
      this.rdata = 0;
    } else if (this.addr === 0xF1) {
      this.rdata = this.uart_busy;
    } else if (this.addr === 0xF2) {
      this.rdata = this.led_out;
    } else if (this.addr === 0xF4) {
      this.rdata = this.mutex_locked;
    } else if (this.addr === 0xF5) {
      this.rdata = this.timer & 0xF;
    } else if (this.addr === 0xF6) {
      this.rdata = this.timer >> 4;
    } else {
      this.rdata = 0;
    }
  }
}

// UART TX: 8N1 serial transmitter
enum UartState { IDLE, WAIT_HI, START, DATA, STOP }

class Nibble4UartTx extends Module {
  @Input clk: Logic<1>;
  @Input rst_n: Logic<1>;
  @Input tx_data: Logic<4>;
  @Input tx_start: Logic<1>;

  @Output tx_pin: Logic<1> = 1;
  @Output tx_busy: Logic<1> = 0;

  private state: Logic<3> = 0;
  private low_nibble: Logic<4> = 0;
  private shift_reg: Logic<8> = 0;
  private bit_idx: Logic<4> = 0;
  private baud_cnt: Logic<16> = 0;

  private readonly BAUD_DIV: Logic<16> = 234;

  @Sequential(clk)
  uart_fsm() {
    switch (this.state) {
      case UartState.IDLE:
        this.tx_pin = 1;
        if (this.tx_start) {
          this.low_nibble = this.tx_data;
          this.state = UartState.WAIT_HI;
        }
        break;

      case UartState.WAIT_HI:
        if (this.tx_start) {
          this.shift_reg = this.tx_data << 4 | this.low_nibble;
          this.tx_busy = 1;
          this.baud_cnt = 0;
          this.state = UartState.START;
        }
        break;

      case UartState.START:
        this.tx_pin = 0;
        if (this.baud_cnt === this.BAUD_DIV) {
          this.baud_cnt = 0;
          this.bit_idx = 0;
          this.state = UartState.DATA;
        } else {
          this.baud_cnt = this.baud_cnt + 1;
        }
        break;

      case UartState.DATA:
        this.tx_pin = this.shift_reg & 1;
        if (this.baud_cnt === this.BAUD_DIV) {
          this.baud_cnt = 0;
          this.shift_reg = this.shift_reg >> 1;
          if (this.bit_idx === 7) {
            this.state = UartState.STOP;
          } else {
            this.bit_idx = this.bit_idx + 1;
          }
        } else {
          this.baud_cnt = this.baud_cnt + 1;
        }
        break;

      case UartState.STOP:
        this.tx_pin = 1;
        if (this.baud_cnt === this.BAUD_DIV) {
          this.baud_cnt = 0;
          this.tx_busy = 0;
          this.state = UartState.IDLE;
        } else {
          this.baud_cnt = this.baud_cnt + 1;
        }
        break;

      default:
        this.state = UartState.IDLE;
        break;
    }
  }
}
