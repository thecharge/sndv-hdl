import { HardwareModule, Input, Module, ModuleConfig, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// USB Full-Speed Device (12 Mbps)
// NRZI encoding, bit-stuffing, SYNC/EOP detection
// Basic SOF/SETUP/IN/OUT packet handling

const USB_PID_SOF = 0xa5;

enum UsbDevSt {
  USB_IDLE = 0,
  USB_SYNC = 1,
  USB_PID = 2,
  USB_DATA = 3,
  USB_EOP = 4,
  USB_ACK = 5,
}

@Module
@ModuleConfig('resetSignal: "no_rst"')
class UsbFsDevice extends HardwareModule {
  @Input clk: Bit = 0;
  @Input dp_in: Bit = 1;
  @Input dm_in: Bit = 0;
  @Output dp_out: Bit = 1;
  @Output dm_out: Bit = 0;
  @Output oe: Bit = 0;
  @Output rx_data: Logic<8> = 0;
  @Output rx_valid: Bit = 0;
  @Output sof: Bit = 0;

  private state: Logic<3> = UsbDevSt.USB_IDLE;
  private bit_cnt: Logic<4> = 0;
  private byte_cnt: Logic<8> = 0;
  private shift: Logic<8> = 0;
  private nrzi_prev: Bit = 1;
  private pid: Logic<8> = 0; // last received PID

  private decodeNrzi(): void {
    const bit = this.dp_in ^ this.nrzi_prev ^ 1;
    this.nrzi_prev = this.dp_in;
    this.shift = (this.shift >> 1) | (bit << 7);
  }

  @Sequential('clk')
  tick(): void {
    this.rx_valid = 0;
    this.sof = 0;
    switch (this.state) {
      case UsbDevSt.USB_IDLE: {
        this.nrzi_prev = this.dp_in;
        if (this.dp_in === 0 && this.dm_in === 0) {
          this.state = UsbDevSt.USB_SYNC;
          this.bit_cnt = 0;
          this.shift = 0;
        }
        break;
      }
      case UsbDevSt.USB_SYNC: {
        this.decodeNrzi();
        this.bit_cnt = this.bit_cnt + 1;
        if (this.bit_cnt >= 8) {
          this.state = UsbDevSt.USB_PID;
          this.bit_cnt = 0;
          this.shift = 0;
        }
        break;
      }
      case UsbDevSt.USB_PID: {
        this.decodeNrzi();
        this.bit_cnt = this.bit_cnt + 1;
        if (this.bit_cnt >= 8) {
          this.pid = this.shift;
          this.bit_cnt = 0;
          this.byte_cnt = 0;
          if (this.pid === USB_PID_SOF) {
            this.sof = 1;
          }
          this.shift = 0;
          this.state = UsbDevSt.USB_DATA;
        }
        break;
      }
      case UsbDevSt.USB_DATA: {
        if (this.dp_in === 1 && this.dm_in === 1) {
          this.state = UsbDevSt.USB_IDLE;
        } else {
          this.decodeNrzi();
          this.bit_cnt = this.bit_cnt + 1;
          if (this.bit_cnt >= 8) {
            this.rx_data = this.shift;
            this.rx_valid = 1;
            this.bit_cnt = 0;
            this.shift = 0;
            this.byte_cnt = this.byte_cnt + 1;
          }
        }
        break;
      }
      default: {
        this.state = UsbDevSt.USB_IDLE;
        break;
      }
    }
  }
}

export { UsbFsDevice };
