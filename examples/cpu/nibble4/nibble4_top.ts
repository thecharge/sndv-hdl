// nibble4_top.ts - Top-level SoC: nibble4 CPU + bootloader + RAM + UART TX.
//
// Ports (Tang Nano 20K):
//   clk     : 27 MHz oscillator (pin 4)
//   rst_n   : S1 button, active-high (pin 88) - used as active-low reset
//   uart_rx : UART RX from host (pin 70)
//   uart_tx : UART TX to host (pin 69)
//   led     : 4 LEDs driven by LED register at 0xF2 (pins 15-18)
//
// Submodule wiring:
//   Nibble4Core      - CPU execution engine
//   Nibble4Memory    - program RAM + peripheral decoder
//   Nibble4UartTx    - 115200 8N1 UART transmitter
//   Nibble4Bootloader - UART RX bootloader, loads program into RAM

import { HardwareModule, Module, ModuleConfig, Input, Output, Submodule, Combinational } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';
import { Nibble4Core } from './nibble4_core';
import { Nibble4Memory, Nibble4UartTx } from './nibble4_soc';
import { Nibble4Bootloader } from './nibble4_bootloader';

@Module
@ModuleConfig('resetSignal: "rst_n"')
class Nibble4Top extends HardwareModule {
    @Input  clk:     Bit = 0;
    @Input  rst_n:   Bit = 1;
    @Input  uart_rx: Bit = 1;

    @Output uart_tx: Bit = 1;
    @Output led:     Logic<4> = 0;

    // ---- Core bus (core outputs, renamed for memory inputs) ----
    // Core drives these; @Combinational fans out to memory-named signals.
    private bus_req:   Bit      = 0;  // core @Output
    private bus_addr:  Logic<8> = 0;  // core @Output
    private bus_wdata: Logic<4> = 0;  // core @Output
    private bus_wen:   Bit      = 0;  // core @Output
    private bus_ack:   Bit      = 0;  // core @Input (driven = 1 always)
    private bus_rdata: Logic<4> = 0;  // core @Input, assigned from rdata

    // ---- Memory bus (memory-facing names) ----
    private addr:  Logic<8> = 0;  // memory @Input
    private wdata: Logic<4> = 0;  // memory @Input
    private wen:   Bit      = 0;  // memory @Input
    private valid: Bit      = 0;  // memory @Input
    private rdata: Logic<4> = 0;  // memory @Output

    // ---- Core enable ----
    private enable:  Bit = 0;   // core @Input
    private cpu_run: Bit = 0;   // bootloader @Output -> core enable

    // ---- UART TX wiring ----
    private uart_tx_data:  Logic<4> = 0;  // memory @Output -> uartTx tx_data
    private uart_tx_start: Bit      = 0;  // memory @Output -> uartTx tx_start
    private tx_data:       Logic<4> = 0;  // uartTx @Input
    private tx_start:      Bit      = 0;  // uartTx @Input
    private tx_busy:       Bit      = 0;  // uartTx @Output
    private tx_pin:        Bit      = 1;  // uartTx @Output -> uart_tx
    private uart_busy:     Bit      = 0;  // memory @Input
    private led_out:       Logic<4> = 0;  // memory @Output -> led

    // ---- Bootloader write interface ----
    private bl_wr_en:   Bit      = 0;  // bootloader @Output, memory @Input
    private bl_wr_addr: Logic<5> = 0;  // bootloader @Output, memory @Input
    private bl_wr_data: Logic<4> = 0;  // bootloader @Output, memory @Input

    @Submodule core       = new Nibble4Core();
    @Submodule mem        = new Nibble4Memory();
    @Submodule uart_txmod = new Nibble4UartTx();
    @Submodule bootloader = new Nibble4Bootloader();

    @Combinational
    bridge(): void {
        // Core bus → memory bus (name translation).
        this.addr  = this.bus_addr;
        this.wdata = this.bus_wdata;
        this.wen   = this.bus_wen;
        this.valid = this.bus_req;

        // Memory read data → core (name translation).
        this.bus_rdata = this.rdata;

        // Stall CPU (bus_ack = 0) when OUT is writing to UART while UART is busy.
        // This ensures sequential output: each nibble waits for the previous TX to finish.
        this.bus_ack = 1;
        if (this.bus_wen === 1) {
            if (this.bus_addr === 0xF0) {
                if (this.tx_busy === 1) {
                    this.bus_ack = 0;
                }
            }
        }

        // Bootloader → core enable.
        this.enable = this.cpu_run;

        // Memory UART outputs → UART TX inputs (name translation).
        this.tx_data  = this.uart_tx_data;
        this.tx_start = this.uart_tx_start;

        // UART TX outputs → memory (busy flag) and top port.
        this.uart_busy = this.tx_busy;
        this.uart_tx   = this.tx_pin;

        // Memory LED register → top LED output.
        this.led = this.led_out;
    }
}

export { Nibble4Top };
