// calc_top.ts - UART Calculator top-level for Tang Nano 20K.
//
// Combines:
//   CalcUartRx  - UART RX (pin 16, uart_rx) at 115200 baud 8N1
//   CalcUartTx  - UART TX (pin 15, uart_tx) at 115200 baud 8N1
//   CalcEngine  - 3-byte receive, compute add/sub/mul, 2-byte send
//
// Board connections (tang_nano_20k.board.json):
//   clk      -> pin 4   (27 MHz oscillator)
//   uart_rx  -> pin 16  (FTDI2232H UART bridge RX, /dev/ttyUSB1)
//   uart_tx  -> pin 15  (FTDI2232H UART bridge TX, /dev/ttyUSB1)
//
// NOTE: pins 15/16 conflict with led[0]/led[1].  Only UART signals are used
// in this design.
//
// Protocol (from client/calc.ts):
//   Host -> FPGA:  3 bytes  [op, a, b]
//     op: 0=add  1=sub  2=mul
//     a, b: 8-bit unsigned operands (0..255)
//   FPGA -> Host:  2 bytes  [result_hi, result_lo]  (16-bit big-endian)
//
// Compile and flash:
//   sudo bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/calc_uart \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/calc_uart \
//     --flash
//
// Then run the client:
//   bun examples/hardware/tang_nano_20k/calc_uart/client/calc.ts

import { HardwareModule, Module, ModuleConfig, Input, Output, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { CalcUartRx } from './calc_uart_rx';
import { CalcUartTx } from './calc_uart_tx';
import { CalcEngine }  from './calc_engine';

@Module
@ModuleConfig('resetSignal: "no_rst"')
class CalcTop extends HardwareModule {
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

    @Submodule rx     = new CalcUartRx();
    @Submodule tx     = new CalcUartTx();
    @Submodule engine = new CalcEngine();
}

export { CalcTop };
