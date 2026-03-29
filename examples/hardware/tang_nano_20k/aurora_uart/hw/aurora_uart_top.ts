// aurora_uart_top.ts - Aurora wave top-level with UART control for Tang Nano 20K.
//
// Combines:
//   AuroraUartRx   - UART RX (pin 70, uart_rx) at 115200 baud 8N1
//   AuroraUartTx   - UART TX (pin 69, uart_tx) at 115200 baud 8N1
//   AuroraGenUart  - Smooth-HSV rainbow generator + UART command processor
//   AuroraSerialiser - 8-pixel WS2812 chain serialiser (pin 79)
//
// Board connections (tang_nano_20k.board.json):
//   clk      -> pin 4   (27 MHz oscillator)
//   btn      -> pin 87  (S2: hold for fast mode, active-high)
//   uart_rx  -> pin 70  (BL616 UART TX -> FPGA input, /dev/ttyUSB1)
//   uart_tx  -> pin 69  (FPGA output -> BL616 UART RX, /dev/ttyUSB1)
//   ws2812   -> pin 79  (WS2812 data line)
//
// UART commands via /dev/ttyUSB1 at 115200 8N1:
//   'a' -> aurora mode (smooth rainbow wave, default)
//   'r' -> red solid
//   'g' -> green solid
//   'b' -> blue solid
//   'f' -> faster (8x speed)
//   's' -> slower (1x speed)
//   'x' -> freeze (hold current colours)
//   ACK: 'K' echoed back for each recognised command
//
// Use client/aurora.py or client/aurora.ts to interact.
//
// Flash:
//   sudo bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/aurora_uart \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/aurora_uart \
//     --flash

import { HardwareModule, Module, ModuleConfig, Input, Output, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { AuroraUartRx }   from './aurora_uart_rx';
import { AuroraUartTx }   from './aurora_uart_tx';
import { AuroraGenUart }  from './aurora_gen_uart';
import { AuroraSerialiser } from './aurora_serialiser';

@Module
@ModuleConfig('resetSignal: "no_rst"')
class AuroraUartTop extends HardwareModule {
    // Board-level ports.
    @Input  clk:     Bit  = 0;
    @Input  btn:     Bit  = 0;    // S2: hardware fast mode
    @Input  uart_rx: Bit  = 1;    // from BL616 UART TX (pin 70), idle=1
    @Output uart_tx: Bit  = 1;    // to   BL616 UART RX (pin 69), idle=1
    @Output ws2812:  Bit  = 0;    // WS2812 data line

    // Intermediate wires — auto-wired by name matching:
    //   rx.rx_data  -> rx_data  -> gen.rx_data
    //   rx.rx_valid -> rx_valid -> gen.rx_valid
    //   gen.tx_data  -> tx_data  -> tx.tx_data
    //   gen.tx_valid -> tx_valid -> tx.tx_valid
    //   gen.pixel0..7 -> pixel0..7 -> ser.pixel0..7
    private rx_data:  Logic<8>  = 0;
    private rx_valid: Bit       = 0;
    private tx_data:  Logic<8>  = 0;
    private tx_valid: Bit       = 0;
    private tx_ready: Bit       = 1;  // not consumed, but prevents dangling output
    private pixel0:   Logic<24> = 0;
    private pixel1:   Logic<24> = 0;
    private pixel2:   Logic<24> = 0;
    private pixel3:   Logic<24> = 0;
    private pixel4:   Logic<24> = 0;
    private pixel5:   Logic<24> = 0;
    private pixel6:   Logic<24> = 0;
    private pixel7:   Logic<24> = 0;

    // Submodule instances (auto-wired by signal name).
    @Submodule rx  = new AuroraUartRx();
    @Submodule tx  = new AuroraUartTx();
    @Submodule gen = new AuroraGenUart();
    @Submodule ser = new AuroraSerialiser();
}

export { AuroraUartTop };
