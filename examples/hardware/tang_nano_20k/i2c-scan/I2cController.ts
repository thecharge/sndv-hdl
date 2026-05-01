import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// I2C at 100kHz: 27MHz / 100kHz = 270 clocks per bit period
const I2C_CLK_DIV = 270;

enum I2cCtrlSt {
    I2C_IDLE = 0, I2C_START = 1, I2C_ADDR = 2, I2C_ADDR_ACK = 3,
    I2C_DATA = 4, I2C_DATA_ACK = 5, I2C_STOP = 6
}

@Module
@ModuleConfig('resetSignal: "no_rst"')
class I2cController extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  start: Bit = 0;
    @Input  addr: Logic<7> = 0;
    @Input  rw: Bit = 0;
    @Input  tx_data: Logic<8> = 0;
    @Input  sda_in: Bit = 1;
    @Output scl: Bit = 1;
    @Output sda_out: Bit = 1;
    @Output sda_oe: Bit = 0;
    @Output rx_data: Logic<8> = 0;
    @Output done: Bit = 0;
    @Output ack_err: Bit = 0;

    private state: Logic<4> = I2cCtrlSt.I2C_IDLE;
    private bit_cnt: Logic<4> = 0;
    private clk_cnt: Logic<9> = 0;
    private shift: Logic<8> = 0;

    @Sequential('clk')
    tick(): void {
        this.done = 0;
        if (this.clk_cnt < I2C_CLK_DIV - 1) {
            this.clk_cnt = this.clk_cnt + 1;
        } else {
            this.clk_cnt = 0;
            switch (this.state) {
                case I2cCtrlSt.I2C_IDLE: {
                    this.scl = 1;
                    this.sda_out = 1;
                    this.sda_oe = 0;
                    if (this.start === 1) {
                        this.state = I2cCtrlSt.I2C_START;
                        this.bit_cnt = 0;
                    }
                    break;
                }
                case I2cCtrlSt.I2C_START: {
                    this.sda_oe = 1;
                    this.sda_out = 0;
                    this.scl = 0;
                    this.shift = (this.addr << 1) | (this.rw & 1);
                    this.state = I2cCtrlSt.I2C_ADDR;
                    this.bit_cnt = 7;
                    break;
                }
                case I2cCtrlSt.I2C_ADDR: {
                    this.scl = this.scl ^ 1;
                    if (this.scl === 0) {
                        if (this.bit_cnt === 0) {
                            this.state = I2cCtrlSt.I2C_ADDR_ACK;
                        } else {
                            this.sda_out = (this.shift >> 7) & 1;
                            this.shift = this.shift << 1;
                            this.bit_cnt = this.bit_cnt - 1;
                        }
                    }
                    break;
                }
                case I2cCtrlSt.I2C_ADDR_ACK: {
                    this.scl = this.scl ^ 1;
                    this.sda_oe = 0;
                    if (this.scl === 0) {
                        this.ack_err = this.sda_in;
                        if (this.rw === 0) {
                            this.shift = this.tx_data;
                            this.bit_cnt = 7;
                            this.state = I2cCtrlSt.I2C_DATA;
                        } else {
                            this.bit_cnt = 7;
                            this.state = I2cCtrlSt.I2C_DATA;
                        }
                        this.sda_oe = 1;
                    }
                    break;
                }
                case I2cCtrlSt.I2C_DATA: {
                    this.scl = this.scl ^ 1;
                    if (this.scl === 0) {
                        if (this.bit_cnt === 0) {
                            this.state = I2cCtrlSt.I2C_DATA_ACK;
                        } else {
                            if (this.rw === 0) {
                                this.sda_out = (this.shift >> 7) & 1;
                                this.shift = this.shift << 1;
                            }
                            this.bit_cnt = this.bit_cnt - 1;
                        }
                    } else {
                        if (this.rw === 1) {
                            this.shift = (this.shift << 1) | (this.sda_in & 1);
                        }
                    }
                    break;
                }
                case I2cCtrlSt.I2C_DATA_ACK: {
                    this.scl = this.scl ^ 1;
                    if (this.scl === 0) {
                        this.rx_data = this.shift & 0xFF;
                        this.done = 1;
                        this.state = I2cCtrlSt.I2C_STOP;
                        this.sda_oe = 1;
                        this.sda_out = 0;
                    }
                    break;
                }
                case I2cCtrlSt.I2C_STOP: {
                    this.scl = 1;
                    this.sda_out = 1;
                    this.sda_oe = 0;
                    this.state = I2cCtrlSt.I2C_IDLE;
                    break;
                }
                default: {
                    this.state = I2cCtrlSt.I2C_IDLE;
                    break;
                }
            }
        }
    }
}

export { I2cController };
