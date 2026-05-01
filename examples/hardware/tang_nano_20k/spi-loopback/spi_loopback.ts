// spi_loopback.ts - SPI loopback test: controller sends, peripheral receives
// Connects SpiController MOSI to SpiPeripheral MOSI (loopback on FPGA).
// LED shows received byte lower 6 bits (active-low).
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/spi-loopback \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/spi-loopback

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { SpiController } from './SpiController';
import { SpiPeripheral } from './SpiPeripheral';

const SEND_PERIOD = 0xFFFFFF;
const TEST_BYTE   = 0xA5;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class SpiLoopback extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output led: Logic<6> = 0x3F;

    private start: Bit = 0;
    private tx_data: Logic<8> = TEST_BYTE;
    private sclk: Bit = 0;
    private mosi: Bit = 0;
    private miso: Bit = 0;
    private cs_n: Bit = 1;
    private ctrl_rx_data: Logic<8> = 0;
    private ctrl_done: Bit = 0;
    private peri_rx_data: Logic<8> = 0;
    private peri_rx_valid: Bit = 0;
    private peri_miso: Bit = 0;

    @Submodule ctrl = new SpiController();
    @Submodule peri = new SpiPeripheral();

    private timer: Logic<25> = 0;

    @Sequential('clk')
    tick(): void {
        this.miso = this.peri_miso;
        this.start = 0;
        this.timer = this.timer + 1;
        if (this.timer === SEND_PERIOD) {
            this.start = 1;
        }
        if (this.peri_rx_valid === 1) {
            this.led = ~this.peri_rx_data & 0x3F;
        }
    }
}

export { SpiLoopback };
