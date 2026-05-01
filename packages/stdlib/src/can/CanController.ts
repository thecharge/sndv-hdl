import { HardwareModule, Input, Module, ModuleConfig, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// CAN 2.0A standard-frame transmitter/receiver
// Bit timing: 27MHz / 27 = 1Mbps
// CRC-15 polynomial: 0x4599
// Bit-stuffing: insert opposite bit after 5 consecutive identical bits

const CAN_BIT_DIV = 27;
const CAN_CRC_POLY = 0x4599;
const CAN_CRC_MASK = 0x7fff;
const CAN_ID_BITS = 10;
const CAN_CRC_BITS = 14;
const CAN_EOF_BITS = 6;
const CAN_IFS_BITS = 2;
const CAN_BYTE_BITS = 7;
const CAN_CTRL_BITS = 5;
enum CanCtrlSt {
  CAN_IDLE = 0,
  CAN_SOF = 1,
  CAN_ID = 2,
  CAN_CTRL = 3,
  CAN_DATA = 4,
  CAN_CRC = 5,
  CAN_CRC_DEL = 6,
  CAN_ACK = 7,
  CAN_EOF = 8,
  CAN_IFS = 9,
}

@Module
@ModuleConfig('resetSignal: "no_rst"')
class CanController extends HardwareModule {
  @Input clk: Bit = 0;
  @Input tx_id: Logic<11> = 0;
  @Input tx_dlc: Logic<4> = 0;
  @Input tx_data0: Logic<8> = 0;
  @Input tx_data1: Logic<8> = 0;
  @Input tx_data2: Logic<8> = 0;
  @Input tx_data3: Logic<8> = 0;
  @Input tx_valid: Bit = 0;
  @Input can_rx: Bit = 1;
  @Output can_tx: Bit = 1;
  @Output tx_ready: Bit = 1;
  @Output rx_id: Logic<11> = 0;
  @Output rx_dlc: Logic<4> = 0;
  @Output rx_data0: Logic<8> = 0;
  @Output rx_data1: Logic<8> = 0;
  @Output rx_data2: Logic<8> = 0;
  @Output rx_data3: Logic<8> = 0;
  @Output rx_valid: Bit = 0;
  @Output ack_err: Bit = 0;

  private state: Logic<4> = CanCtrlSt.CAN_IDLE;
  private bit_timer: Logic<5> = 0;
  private bit_cnt: Logic<5> = 0;
  private shift: Logic<16> = 0;
  private stuff_cnt: Logic<3> = 0;
  private last_bit: Bit = 1;
  private crc: Logic<15> = 0;
  private dlc_buf: Logic<4> = 0;
  private byte_cnt: Logic<3> = 0;
  private is_tx: Bit = 0;
  private tx_id_buf: Logic<11> = 0;
  private cur_bit: Bit = 1;
  private crc_inv: Bit = 0;

  private loadTxIdBit(): void {
    this.cur_bit = (this.tx_id_buf >> this.bit_cnt) & 1;
  }

  private loadCrcBit(): void {
    this.cur_bit = (this.crc >> this.bit_cnt) & 1;
  }

  private sampleRx(): void {
    this.cur_bit = this.can_rx;
  }

  private doStuff(): void {
    if (this.cur_bit === this.last_bit) {
      this.stuff_cnt = this.stuff_cnt + 1;
    } else {
      this.stuff_cnt = 1;
      this.last_bit = this.cur_bit;
    }
  }

  private doUpdateCrc(): void {
    this.crc_inv = this.cur_bit ^ ((this.crc >> 14) & 1);
    if (this.crc_inv !== 0) {
      this.crc = ((this.crc << 1) & CAN_CRC_MASK) ^ CAN_CRC_POLY;
    } else {
      this.crc = (this.crc << 1) & CAN_CRC_MASK;
    }
  }

  @Sequential('clk')
  tick(): void {
    this.rx_valid = 0;
    this.ack_err = 0;
    if (this.bit_timer < CAN_BIT_DIV - 1) {
      this.bit_timer = this.bit_timer + 1;
    } else {
      this.bit_timer = 0;
      switch (this.state) {
        case CanCtrlSt.CAN_IDLE: {
          this.can_tx = 1;
          this.tx_ready = 1;
          this.stuff_cnt = 0;
          this.last_bit = 1;
          if (this.can_rx === 0) {
            this.state = CanCtrlSt.CAN_SOF;
            this.crc = 0;
            this.bit_cnt = CAN_ID_BITS;
            this.shift = 0;
            this.tx_ready = 0;
            if (this.tx_valid === 1) {
              this.is_tx = 1;
              this.tx_id_buf = this.tx_id;
              this.dlc_buf = this.tx_dlc;
            } else {
              this.is_tx = 0;
            }
          }
          break;
        }
        case CanCtrlSt.CAN_SOF: {
          this.cur_bit = 0;
          this.doUpdateCrc();
          this.doStuff();
          this.can_tx = 0;
          this.state = CanCtrlSt.CAN_ID;
          break;
        }
        case CanCtrlSt.CAN_ID: {
          if (this.is_tx === 1) {
            this.loadTxIdBit();
            this.can_tx = this.cur_bit;
          } else {
            this.sampleRx();
          }
          this.doUpdateCrc();
          this.doStuff();
          this.shift = (this.shift << 1) | (this.cur_bit & 1);
          if (this.bit_cnt === 0) {
            this.rx_id = this.shift & 0x7ff;
            this.state = CanCtrlSt.CAN_CTRL;
            this.bit_cnt = CAN_CTRL_BITS;
            this.shift = 0;
          } else {
            this.bit_cnt = this.bit_cnt - 1;
          }
          break;
        }
        case CanCtrlSt.CAN_CTRL: {
          if (this.is_tx === 1) {
            this.cur_bit = (this.dlc_buf >> this.bit_cnt) & 1;
            this.can_tx = this.cur_bit;
          } else {
            this.sampleRx();
          }
          this.doUpdateCrc();
          this.doStuff();
          this.shift = (this.shift << 1) | (this.cur_bit & 1);
          if (this.bit_cnt === 0) {
            this.dlc_buf = this.shift & 0xf;
            this.rx_dlc = this.shift & 0xf;
            if ((this.shift & 0xf) === 0) {
              this.state = CanCtrlSt.CAN_CRC;
              this.bit_cnt = CAN_CRC_BITS;
            } else {
              this.state = CanCtrlSt.CAN_DATA;
              this.bit_cnt = CAN_BYTE_BITS;
              this.byte_cnt = 0;
              this.shift = 0;
            }
          } else {
            this.bit_cnt = this.bit_cnt - 1;
          }
          break;
        }
        case CanCtrlSt.CAN_DATA: {
          if (this.is_tx === 1) {
            if (this.byte_cnt === 0) {
              this.cur_bit = (this.tx_data0 >> this.bit_cnt) & 1;
            }
            if (this.byte_cnt === 1) {
              this.cur_bit = (this.tx_data1 >> this.bit_cnt) & 1;
            }
            if (this.byte_cnt === 2) {
              this.cur_bit = (this.tx_data2 >> this.bit_cnt) & 1;
            }
            if (this.byte_cnt === 3) {
              this.cur_bit = (this.tx_data3 >> this.bit_cnt) & 1;
            }
            this.can_tx = this.cur_bit;
          } else {
            this.sampleRx();
          }
          this.doUpdateCrc();
          this.doStuff();
          this.shift = (this.shift << 1) | (this.cur_bit & 1);
          if (this.bit_cnt === 0) {
            if (this.byte_cnt === 0) {
              this.rx_data0 = this.shift & 0xff;
            }
            if (this.byte_cnt === 1) {
              this.rx_data1 = this.shift & 0xff;
            }
            if (this.byte_cnt === 2) {
              this.rx_data2 = this.shift & 0xff;
            }
            if (this.byte_cnt === 3) {
              this.rx_data3 = this.shift & 0xff;
            }
            this.byte_cnt = this.byte_cnt + 1;
            this.shift = 0;
            if (this.byte_cnt >= this.dlc_buf) {
              this.state = CanCtrlSt.CAN_CRC;
              this.bit_cnt = CAN_CRC_BITS;
            } else {
              this.bit_cnt = CAN_BYTE_BITS;
            }
          } else {
            this.bit_cnt = this.bit_cnt - 1;
          }
          break;
        }
        case CanCtrlSt.CAN_CRC: {
          if (this.is_tx === 1) {
            this.loadCrcBit();
            this.can_tx = this.cur_bit;
          }
          if (this.bit_cnt === 0) {
            this.state = CanCtrlSt.CAN_CRC_DEL;
            this.can_tx = 1;
          } else {
            this.bit_cnt = this.bit_cnt - 1;
          }
          break;
        }
        case CanCtrlSt.CAN_CRC_DEL: {
          this.can_tx = 1;
          this.state = CanCtrlSt.CAN_ACK;
          if (this.is_tx === 1) {
            this.can_tx = 1; // recessive - wait for receiver ACK
          } else {
            this.can_tx = 0; // dominant ACK
          }
          break;
        }
        case CanCtrlSt.CAN_ACK: {
          if (this.is_tx === 1) {
            if (this.can_rx !== 0) {
              this.ack_err = 1;
            }
          } else {
            this.rx_valid = 1;
          }
          this.can_tx = 1;
          this.state = CanCtrlSt.CAN_EOF;
          this.bit_cnt = CAN_EOF_BITS;
          break;
        }
        case CanCtrlSt.CAN_EOF: {
          this.can_tx = 1;
          if (this.bit_cnt === 0) {
            this.state = CanCtrlSt.CAN_IFS;
            this.bit_cnt = CAN_IFS_BITS;
          } else {
            this.bit_cnt = this.bit_cnt - 1;
          }
          break;
        }
        case CanCtrlSt.CAN_IFS: {
          if (this.bit_cnt === 0) {
            this.state = CanCtrlSt.CAN_IDLE;
          } else {
            this.bit_cnt = this.bit_cnt - 1;
          }
          break;
        }
        default: {
          this.state = CanCtrlSt.CAN_IDLE;
          break;
        }
      }
    }
  }
}

export { CanController };
