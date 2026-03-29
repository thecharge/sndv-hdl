// uart_echo_top.ts - UART echo diagnostic for Tang Nano 20K.
//
// WHAT THIS DOES:
//   Any byte received on uart_rx (pin 16) is echoed back on uart_tx (pin 15).
//   Use this to verify that both UART TX and RX are working and that you are
//   on the correct serial port before debugging higher-level protocol issues.
//
// TEST PROCEDURE:
//   1. Flash this design:   ./flash.sh
//   2. Power-cycle the board (unplug + replug USB).
//   3. Run:  python3 -c "
//        import serial, glob
//        port = sorted(glob.glob('/dev/ttyUSB*'))[-1]
//        s = serial.Serial(port, 115200, timeout=2)
//        s.write(b'Hello')
//        r = s.read(5)
//        print('echo:', r)   # expected: b'Hello'
//        s.close()
//      "
//
// If you receive the bytes back, both TX/RX pins and the serial port are correct.
// If you receive nothing, check the port number (ls /dev/ttyUSB*) and try again.
//
// Board connections (tang_nano_20k.board.json):
//   clk     -> pin 4   (27 MHz)
//   uart_rx -> pin 70  (BL616 UART TX -> FPGA input)
//   uart_tx -> pin 69  (FPGA output -> BL616 UART RX)
//
// Compile and flash:
//   ./examples/hardware/tang_nano_20k/uart_echo/flash.sh

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { UartEchoRx } from './uart_echo_rx';
import { UartEchoTx } from './uart_echo_tx';

@Module
@ModuleConfig('resetSignal: "no_rst"')
class UartEchoTop extends HardwareModule {
    @Input  clk:     Bit = 0;
    @Input  uart_rx: Bit = 1;
    @Output uart_tx: Bit = 1;

    // Internal wires - auto-wired by name matching:
    //   rx.rx_data   -> rx_data  -> echo -> tx.tx_data
    //   rx.rx_valid  -> rx_valid -> echo -> tx.tx_valid
    //   tx.tx_ready  -> tx_ready -> echo
    private rx_data:     Logic<8> = 0;
    private rx_valid:    Bit      = 0;
    private tx_data:     Logic<8> = 0;
    private tx_valid:    Bit      = 0;
    private tx_ready:    Bit      = 1;

    // One-byte echo buffer: holds a received byte until TX is ready.
    private pendingByte: Logic<8> = 0;
    private hasPending:  Bit      = 0;

    @Submodule rx = new UartEchoRx();
    @Submodule tx = new UartEchoTx();

    @Sequential('clk')
    tick(): void {
        this.tx_valid = 0;

        // Latch incoming byte into pending buffer (overwrites if TX still busy).
        if (this.rx_valid === 1) {
            this.pendingByte = this.rx_data;
            this.hasPending  = 1;
        }

        // Send pending byte as soon as TX is idle.
        if (this.hasPending === 1) {
            if (this.tx_ready === 1) {
                this.tx_data    = this.pendingByte;
                this.tx_valid   = 1;
                this.hasPending = 0;
            }
        }
    }
}

export { UartEchoTop };
