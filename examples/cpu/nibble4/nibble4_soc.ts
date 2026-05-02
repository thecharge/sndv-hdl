// nibble4_soc.ts - nibble4 SoC peripherals: 32-nibble program RAM,
// bus arbiter, peripheral memory map, UART TX (single-nibble protocol).
//
// Memory map (nibble-addressed, 4-bit data per address):
//   0x00-0x1F : Program RAM  (32 nibble cells, bootloader-writable)
//   0x20-0xEF : Reserved (reads as 0)
//   0xF0      : UART TX data (write nibble -> sends as low byte 0x0N over UART)
//   0xF1      : UART TX busy (read: 0=ready, 1=busy)
//   0xF2      : LED output register
//   0xF4      : Mutex lock (read: TAS; write any: unlock)
//   0xF5      : Timer low nibble
//   0xF6      : Timer high nibble
//
// UART TX protocol: one nibble write to 0xF0 sends one byte 0x00..0x0F.
// The host reads this as a nibble value (low 4 bits of received byte).
// BAUD_DIV = 234 clocks per bit at 27 MHz = 115200 baud.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Combinational } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const BAUD_DIV     = 234;
const MEM_RAM_END  = 0x20;  // first address above RAM
const MEM_PERIPH   = 0xF0;  // peripheral base

// Bus arbiter: round-robin between 2 cores.
@Module
@ModuleConfig('resetSignal: "rst_n"')
class Nibble4Arbiter extends HardwareModule {
    @Input  clk:     Bit       = 0;
    @Input  rst_n:   Bit       = 1;
    @Input  req_0:   Bit       = 0;
    @Input  addr_0:  Logic<8>  = 0;
    @Input  wdata_0: Logic<4>  = 0;
    @Input  wen_0:   Bit       = 0;
    @Input  req_1:   Bit       = 0;
    @Input  addr_1:  Logic<8>  = 0;
    @Input  wdata_1: Logic<4>  = 0;
    @Input  wen_1:   Bit       = 0;

    @Output ack_0:     Bit      = 0;
    @Output ack_1:     Bit      = 0;
    @Output bus_addr:  Logic<8> = 0;
    @Output bus_wdata: Logic<4> = 0;
    @Output bus_wen:   Bit      = 0;
    @Output bus_valid: Bit      = 0;

    private arbPrio: Bit = 0;

    @Sequential('clk')
    arbitrate(): void {
        if (this.req_0 === 1) {
            if (this.req_1 === 0) {
                this.ack_0 = 1; this.ack_1 = 0;
                this.bus_addr = this.addr_0; this.bus_wdata = this.wdata_0;
                this.bus_wen = this.wen_0; this.bus_valid = 1; this.arbPrio = 1;
            } else if (this.arbPrio === 0) {
                this.ack_0 = 1; this.ack_1 = 0;
                this.bus_addr = this.addr_0; this.bus_wdata = this.wdata_0;
                this.bus_wen = this.wen_0; this.bus_valid = 1; this.arbPrio = 1;
            } else {
                this.ack_0 = 0; this.ack_1 = 1;
                this.bus_addr = this.addr_1; this.bus_wdata = this.wdata_1;
                this.bus_wen = this.wen_1; this.bus_valid = 1; this.arbPrio = 0;
            }
        } else if (this.req_1 === 1) {
            this.ack_0 = 0; this.ack_1 = 1;
            this.bus_addr = this.addr_1; this.bus_wdata = this.wdata_1;
            this.bus_wen = this.wen_1; this.bus_valid = 1; this.arbPrio = 0;
        } else {
            this.ack_0 = 0; this.ack_1 = 0; this.bus_valid = 0;
        }
    }
}

// Shared RAM (0x00-0x1F) + peripheral decoder (0xF0+).
// bl_wr_* ports allow the bootloader to write nibbles directly into program RAM.
@Module
@ModuleConfig('resetSignal: "rst_n"')
class Nibble4Memory extends HardwareModule {
    @Input  clk:        Bit       = 0;
    @Input  rst_n:      Bit       = 1;
    @Input  addr:       Logic<8>  = 0;
    @Input  wdata:      Logic<4>  = 0;
    @Input  wen:        Bit       = 0;
    @Input  valid:      Bit       = 0;
    @Input  uart_busy:  Bit       = 0;

    // Bootloader write interface (bypasses CPU bus, loads program into RAM).
    @Input  bl_wr_en:   Bit       = 0;
    @Input  bl_wr_addr: Logic<5>  = 0;
    @Input  bl_wr_data: Logic<4>  = 0;

    @Output rdata:         Logic<4> = 0;
    @Output uart_tx_data:  Logic<4> = 0;
    @Output uart_tx_start: Bit      = 0;
    @Output led_out:       Logic<4> = 0;

    // 32-nibble program RAM (addresses 0x00-0x1F).
    private m00: Logic<4> = 0; private m01: Logic<4> = 0;
    private m02: Logic<4> = 0; private m03: Logic<4> = 0;
    private m04: Logic<4> = 0; private m05: Logic<4> = 0;
    private m06: Logic<4> = 0; private m07: Logic<4> = 0;
    private m08: Logic<4> = 0; private m09: Logic<4> = 0;
    private m10: Logic<4> = 0; private m11: Logic<4> = 0;
    private m12: Logic<4> = 0; private m13: Logic<4> = 0;
    private m14: Logic<4> = 0; private m15: Logic<4> = 0;
    private m16: Logic<4> = 0; private m17: Logic<4> = 0;
    private m18: Logic<4> = 0; private m19: Logic<4> = 0;
    private m20: Logic<4> = 0; private m21: Logic<4> = 0;
    private m22: Logic<4> = 0; private m23: Logic<4> = 0;
    private m24: Logic<4> = 0; private m25: Logic<4> = 0;
    private m26: Logic<4> = 0; private m27: Logic<4> = 0;
    private m28: Logic<4> = 0; private m29: Logic<4> = 0;
    private m30: Logic<4> = 0; private m31: Logic<4> = 0;

    // Peripheral state.
    private mutex_locked: Bit      = 0;
    private timer:        Logic<8> = 0;

    @Sequential('clk')
    mem_logic(): void {
        this.uart_tx_start = 0;
        this.timer = this.timer + 1;

        // CPU peripheral writes.
        if (this.valid === 1) {
            if (this.addr >= MEM_PERIPH) {
                if (this.wen === 1) {
                    if (this.addr === MEM_PERIPH) {
                        this.uart_tx_data  = this.wdata;
                        this.uart_tx_start = 1;
                    } else if (this.addr === MEM_PERIPH + 2) {
                        this.led_out = this.wdata;
                    } else if (this.addr === MEM_PERIPH + 4) {
                        this.mutex_locked = 0;
                    }
                } else {
                    if (this.addr === MEM_PERIPH + 4) {
                        if (this.mutex_locked === 0) { this.mutex_locked = 1; }
                    }
                }
            }
        }

        // Bootloader RAM writes (bypass CPU bus).
        if (this.bl_wr_en === 1) {
            if (this.bl_wr_addr === 0)  { this.m00 = this.bl_wr_data; }
            if (this.bl_wr_addr === 1)  { this.m01 = this.bl_wr_data; }
            if (this.bl_wr_addr === 2)  { this.m02 = this.bl_wr_data; }
            if (this.bl_wr_addr === 3)  { this.m03 = this.bl_wr_data; }
            if (this.bl_wr_addr === 4)  { this.m04 = this.bl_wr_data; }
            if (this.bl_wr_addr === 5)  { this.m05 = this.bl_wr_data; }
            if (this.bl_wr_addr === 6)  { this.m06 = this.bl_wr_data; }
            if (this.bl_wr_addr === 7)  { this.m07 = this.bl_wr_data; }
            if (this.bl_wr_addr === 8)  { this.m08 = this.bl_wr_data; }
            if (this.bl_wr_addr === 9)  { this.m09 = this.bl_wr_data; }
            if (this.bl_wr_addr === 10) { this.m10 = this.bl_wr_data; }
            if (this.bl_wr_addr === 11) { this.m11 = this.bl_wr_data; }
            if (this.bl_wr_addr === 12) { this.m12 = this.bl_wr_data; }
            if (this.bl_wr_addr === 13) { this.m13 = this.bl_wr_data; }
            if (this.bl_wr_addr === 14) { this.m14 = this.bl_wr_data; }
            if (this.bl_wr_addr === 15) { this.m15 = this.bl_wr_data; }
            if (this.bl_wr_addr === 16) { this.m16 = this.bl_wr_data; }
            if (this.bl_wr_addr === 17) { this.m17 = this.bl_wr_data; }
            if (this.bl_wr_addr === 18) { this.m18 = this.bl_wr_data; }
            if (this.bl_wr_addr === 19) { this.m19 = this.bl_wr_data; }
            if (this.bl_wr_addr === 20) { this.m20 = this.bl_wr_data; }
            if (this.bl_wr_addr === 21) { this.m21 = this.bl_wr_data; }
            if (this.bl_wr_addr === 22) { this.m22 = this.bl_wr_data; }
            if (this.bl_wr_addr === 23) { this.m23 = this.bl_wr_data; }
            if (this.bl_wr_addr === 24) { this.m24 = this.bl_wr_data; }
            if (this.bl_wr_addr === 25) { this.m25 = this.bl_wr_data; }
            if (this.bl_wr_addr === 26) { this.m26 = this.bl_wr_data; }
            if (this.bl_wr_addr === 27) { this.m27 = this.bl_wr_data; }
            if (this.bl_wr_addr === 28) { this.m28 = this.bl_wr_data; }
            if (this.bl_wr_addr === 29) { this.m29 = this.bl_wr_data; }
            if (this.bl_wr_addr === 30) { this.m30 = this.bl_wr_data; }
            if (this.bl_wr_addr === 31) { this.m31 = this.bl_wr_data; }
        }
    }

    @Combinational
    read_mux(): void {
        if (this.addr < MEM_RAM_END) {
            if (this.addr === 0)  { this.rdata = this.m00; }
            else if (this.addr === 1)  { this.rdata = this.m01; }
            else if (this.addr === 2)  { this.rdata = this.m02; }
            else if (this.addr === 3)  { this.rdata = this.m03; }
            else if (this.addr === 4)  { this.rdata = this.m04; }
            else if (this.addr === 5)  { this.rdata = this.m05; }
            else if (this.addr === 6)  { this.rdata = this.m06; }
            else if (this.addr === 7)  { this.rdata = this.m07; }
            else if (this.addr === 8)  { this.rdata = this.m08; }
            else if (this.addr === 9)  { this.rdata = this.m09; }
            else if (this.addr === 10) { this.rdata = this.m10; }
            else if (this.addr === 11) { this.rdata = this.m11; }
            else if (this.addr === 12) { this.rdata = this.m12; }
            else if (this.addr === 13) { this.rdata = this.m13; }
            else if (this.addr === 14) { this.rdata = this.m14; }
            else if (this.addr === 15) { this.rdata = this.m15; }
            else if (this.addr === 16) { this.rdata = this.m16; }
            else if (this.addr === 17) { this.rdata = this.m17; }
            else if (this.addr === 18) { this.rdata = this.m18; }
            else if (this.addr === 19) { this.rdata = this.m19; }
            else if (this.addr === 20) { this.rdata = this.m20; }
            else if (this.addr === 21) { this.rdata = this.m21; }
            else if (this.addr === 22) { this.rdata = this.m22; }
            else if (this.addr === 23) { this.rdata = this.m23; }
            else if (this.addr === 24) { this.rdata = this.m24; }
            else if (this.addr === 25) { this.rdata = this.m25; }
            else if (this.addr === 26) { this.rdata = this.m26; }
            else if (this.addr === 27) { this.rdata = this.m27; }
            else if (this.addr === 28) { this.rdata = this.m28; }
            else if (this.addr === 29) { this.rdata = this.m29; }
            else if (this.addr === 30) { this.rdata = this.m30; }
            else                       { this.rdata = this.m31; }
        } else if (this.addr === MEM_PERIPH + 1) {
            this.rdata = this.uart_busy & 0xF;
        } else if (this.addr === MEM_PERIPH + 2) {
            this.rdata = this.led_out;
        } else if (this.addr === MEM_PERIPH + 4) {
            this.rdata = this.mutex_locked & 0xF;
        } else if (this.addr === MEM_PERIPH + 5) {
            this.rdata = this.timer & 0xF;
        } else if (this.addr === MEM_PERIPH + 6) {
            this.rdata = this.timer >> 4;
        } else {
            this.rdata = 0;
        }
    }
}

// UART TX: 8N1 serial transmitter.
// One nibble write to 0xF0 sends one byte (bits[7:4]=0, bits[3:0]=nibble).
// At 115200 baud / 27 MHz: BAUD_DIV = 234 clocks per bit.
enum UTxSt { UTX_IDLE = 0, UTX_START = 1, UTX_DATA = 2, UTX_STOP = 3 }

@Module
@ModuleConfig('resetSignal: "rst_n"')
class Nibble4UartTx extends HardwareModule {
    @Input  clk:      Bit       = 0;
    @Input  rst_n:    Bit       = 1;
    @Input  tx_data:  Logic<4>  = 0;
    @Input  tx_start: Bit       = 0;

    @Output tx_pin:  Bit = 1;
    @Output tx_busy: Bit = 0;

    private state:    Logic<2>  = UTxSt.UTX_IDLE;
    private shift_reg: Logic<8> = 0;
    private bit_idx:   Logic<4> = 0;
    private baud_cnt:  Logic<8> = 0;

    @Sequential('clk')
    uart_fsm(): void {
        switch (this.state) {
            case UTxSt.UTX_IDLE:
                this.tx_pin = 1;
                this.tx_busy = 0;
                if (this.tx_start === 1) {
                    this.shift_reg = this.tx_data & 0xF;
                    this.baud_cnt  = 0;
                    this.tx_busy   = 1;
                    this.state     = UTxSt.UTX_START;
                }
                break;

            case UTxSt.UTX_START:
                this.tx_pin = 0;
                if (this.baud_cnt >= BAUD_DIV - 1) {
                    this.baud_cnt = 0;
                    this.bit_idx  = 0;
                    this.state    = UTxSt.UTX_DATA;
                } else {
                    this.baud_cnt = this.baud_cnt + 1;
                }
                break;

            case UTxSt.UTX_DATA:
                this.tx_pin = this.shift_reg & 1;
                if (this.baud_cnt >= BAUD_DIV - 1) {
                    this.baud_cnt  = 0;
                    this.shift_reg = this.shift_reg >> 1;
                    if (this.bit_idx >= 7) {
                        this.state = UTxSt.UTX_STOP;
                    } else {
                        this.bit_idx = this.bit_idx + 1;
                    }
                } else {
                    this.baud_cnt = this.baud_cnt + 1;
                }
                break;

            case UTxSt.UTX_STOP:
                this.tx_pin = 1;
                if (this.baud_cnt >= BAUD_DIV - 1) {
                    this.baud_cnt = 0;
                    this.tx_busy  = 0;
                    this.state    = UTxSt.UTX_IDLE;
                } else {
                    this.baud_cnt = this.baud_cnt + 1;
                }
                break;

            default:
                this.state = UTxSt.UTX_IDLE;
                break;
        }
    }
}

export { Nibble4Arbiter, Nibble4Memory, Nibble4UartTx };
