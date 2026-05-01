// tpu_top.ts - TPU UART top-level for Tang Nano 20K.
// Wires TpuUartRx + TpuUartTx + TpuEngine by name matching.
//
// Board connections:
//   clk     -> pin 4   (27 MHz)
//   uart_rx -> pin 70  (BL616 UART TX -> FPGA, /dev/ttyUSB1)
//   uart_tx -> pin 69  (FPGA -> BL616 UART RX)
//
// Protocol: see tpu_engine.ts

import { HardwareModule, Module, ModuleConfig, Input, Output, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { TpuUartRx } from './tpu_uart_rx';
import { TpuUartTx } from './tpu_uart_tx';
import { TpuEngine }  from './tpu_engine';

@Module
@ModuleConfig('resetSignal: "no_rst"')
class TpuTop extends HardwareModule {
    @Input  clk:     Bit = 0;
    @Input  uart_rx: Bit = 1;
    @Output uart_tx: Bit = 1;

    // Internal wires - auto-wired by name matching:
    //   rx.rx_data   -> rx_data   -> engine.rx_data
    //   rx.rx_valid  -> rx_valid  -> engine.rx_valid
    //   engine.tx_data  -> tx_data  -> tx.tx_data
    //   engine.tx_valid -> tx_valid -> tx.tx_valid
    //   tx.tx_ready  -> tx_ready  -> engine.tx_ready
    private rx_data:  Logic<8> = 0;
    private rx_valid: Bit      = 0;
    private tx_data:  Logic<8> = 0;
    private tx_valid: Bit      = 0;
    private tx_ready: Bit      = 1;

    @Submodule rx     = new TpuUartRx();
    @Submodule tx     = new TpuUartTx();
    @Submodule engine = new TpuEngine();
}

export { TpuTop };
