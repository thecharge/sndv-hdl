import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const RX_BIT_PERIOD = 234;
const RX_HALF_PERIOD = 117;

enum RxState { RX_IDLE = 0, RX_START = 1, RX_DATA = 2, RX_STOP = 3 }

@Module
@ModuleConfig('resetSignal: "no_rst"')
class UartRx extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  rx: Bit = 1;
    @Output rx_valid: Bit = 0;
    @Output rx_data: Logic<8> = 0;

    private state: Logic<2> = RxState.RX_IDLE;
    private bit_cnt: Logic<4> = 0;
    private baud_cnt: Logic<8> = 0;
    private shift: Logic<8> = 0;

    @Sequential('clk')
    tick(): void {
        this.rx_valid = 0;
        switch (this.state) {
            case RxState.RX_IDLE: {
                if (this.rx === 0) {
                    this.baud_cnt = 0;
                    this.state = RxState.RX_START;
                }
                break;
            }
            case RxState.RX_START: {
                if (this.baud_cnt >= RX_HALF_PERIOD - 1) {
                    if (this.rx === 0) {
                        this.baud_cnt = 0;
                        this.bit_cnt = 0;
                        this.state = RxState.RX_DATA;
                    } else {
                        this.state = RxState.RX_IDLE;
                    }
                } else {
                    this.baud_cnt = this.baud_cnt + 1;
                }
                break;
            }
            case RxState.RX_DATA: {
                if (this.baud_cnt >= RX_BIT_PERIOD - 1) {
                    this.baud_cnt = 0;
                    this.shift = (this.rx << 7) | (this.shift >> 1);
                    if (this.bit_cnt >= 7) {
                        this.state = RxState.RX_STOP;
                    } else {
                        this.bit_cnt = this.bit_cnt + 1;
                    }
                } else {
                    this.baud_cnt = this.baud_cnt + 1;
                }
                break;
            }
            case RxState.RX_STOP: {
                if (this.baud_cnt >= RX_BIT_PERIOD - 1) {
                    this.baud_cnt = 0;
                    this.rx_data = this.shift;
                    this.rx_valid = 1;
                    this.state = RxState.RX_IDLE;
                } else {
                    this.baud_cnt = this.baud_cnt + 1;
                }
                break;
            }
            default: {
                this.state = RxState.RX_IDLE;
                break;
            }
        }
    }
}

export { UartRx };
