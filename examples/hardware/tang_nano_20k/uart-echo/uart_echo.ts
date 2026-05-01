// uart_echo.ts - UART loopback echo example for Tang Nano 20K
// Receives a byte via UART RX, echoes it back via UART TX.
// UART: 115200 8N1 at 27 MHz. Pin 70 = RX, Pin 69 = TX.
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/uart-echo \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/uart-echo

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { UartTx } from './UartTx';
import { UartRx } from './UartRx';

@Module
@ModuleConfig('resetSignal: "no_rst"')
class UartEcho extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  uart_rx: Bit = 1;
    @Output uart_tx: Bit = 1;
    @Output led: Logic<6> = 0x3F;

    private tx_valid: Bit = 0;
    private tx_data: Logic<8> = 0;
    private tx: Bit = 1;
    private tx_ready: Bit = 1;
    private rx: Bit = 1;
    private rx_valid: Bit = 0;
    private rx_data: Logic<8> = 0;

    @Submodule txmod = new UartTx();
    @Submodule rxmod = new UartRx();

    @Sequential('clk')
    tick(): void {
        this.rx = this.uart_rx;
        this.uart_tx = this.tx;
        this.tx_valid = 0;
        if (this.rx_valid === 1) {
            this.tx_data = this.rx_data;
            this.tx_valid = 1;
            this.led = ~this.rx_data & 0x3F;
        }
    }
}

export { UartEcho };
