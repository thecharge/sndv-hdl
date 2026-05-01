import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const SPI_CLK_DIV = 4;

enum SpiCtrlState { SPI_IDLE = 0, SPI_ACTIVE = 1, SPI_DONE = 2 }

@Module
@ModuleConfig('resetSignal: "no_rst"')
class SpiController extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  tx_valid: Bit = 0;
    @Input  tx_data: Logic<8> = 0;
    @Input  miso: Bit = 0;
    @Output mosi: Bit = 0;
    @Output sclk: Bit = 0;
    @Output cs_n: Bit = 1;
    @Output rx_data: Logic<8> = 0;
    @Output rx_valid: Bit = 0;
    @Output ready: Bit = 1;

    private state: Logic<2> = SpiCtrlState.SPI_IDLE;
    private bit_cnt: Logic<4> = 0;
    private clk_div: Logic<4> = 0;
    private shift_tx: Logic<8> = 0;
    private shift_rx: Logic<8> = 0;

    @Sequential('clk')
    tick(): void {
        this.rx_valid = 0;
        switch (this.state) {
            case SpiCtrlState.SPI_IDLE: {
                this.cs_n = 1;
                this.sclk = 0;
                this.ready = 1;
                if (this.tx_valid === 1) {
                    this.shift_tx = this.tx_data;
                    this.bit_cnt = 0;
                    this.clk_div = 0;
                    this.cs_n = 0;
                    this.ready = 0;
                    this.state = SpiCtrlState.SPI_ACTIVE;
                }
                break;
            }
            case SpiCtrlState.SPI_ACTIVE: {
                if (this.clk_div >= SPI_CLK_DIV - 1) {
                    this.clk_div = 0;
                    this.sclk = this.sclk ^ 1;
                    if (this.sclk === 0) {
                        this.mosi = (this.shift_tx >> 7) & 1;
                        this.shift_tx = this.shift_tx << 1;
                    } else {
                        this.shift_rx = (this.shift_rx << 1) | (this.miso & 1);
                        if (this.bit_cnt >= 7) {
                            this.state = SpiCtrlState.SPI_DONE;
                        } else {
                            this.bit_cnt = this.bit_cnt + 1;
                        }
                    }
                } else {
                    this.clk_div = this.clk_div + 1;
                }
                break;
            }
            case SpiCtrlState.SPI_DONE: {
                this.cs_n = 1;
                this.sclk = 0;
                this.rx_data = this.shift_rx;
                this.rx_valid = 1;
                this.state = SpiCtrlState.SPI_IDLE;
                break;
            }
            default: {
                this.state = SpiCtrlState.SPI_IDLE;
                break;
            }
        }
    }
}

export { SpiController };
