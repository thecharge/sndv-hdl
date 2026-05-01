import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
@ModuleConfig('resetSignal: "no_rst"')
class SpiPeripheral extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  sclk: Bit = 0;
    @Input  cs_n: Bit = 1;
    @Input  mosi: Bit = 0;
    @Input  tx_data: Logic<8> = 0;
    @Output miso: Bit = 0;
    @Output rx_data: Logic<8> = 0;
    @Output rx_valid: Bit = 0;

    private bit_cnt: Logic<4> = 0;
    private shift_rx: Logic<8> = 0;
    private shift_tx: Logic<8> = 0;
    private sclk_prev: Bit = 0;

    @Sequential('clk')
    tick(): void {
        this.rx_valid = 0;
        this.sclk_prev = this.sclk;
        if (this.cs_n === 0) {
            // Sample on rising edge of sclk (mode 0)
            if (this.sclk_prev === 0 && this.sclk === 1) {
                this.shift_rx = (this.shift_rx << 1) | (this.mosi & 1);
                this.bit_cnt = this.bit_cnt + 1;
                if (this.bit_cnt >= 8) {
                    this.bit_cnt = 0;
                    this.rx_data = this.shift_rx;
                    this.rx_valid = 1;
                    this.shift_tx = this.tx_data;
                }
            }
            // Drive MISO on falling edge
            if (this.sclk_prev === 1 && this.sclk === 0) {
                this.miso = (this.shift_tx >> 7) & 1;
                this.shift_tx = this.shift_tx << 1;
            }
        } else {
            this.bit_cnt = 0;
            this.shift_tx = this.tx_data;
        }
    }
}

export { SpiPeripheral };
