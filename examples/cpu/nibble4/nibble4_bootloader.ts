// nibble4_bootloader.ts - UART RX bootloader for the nibble4 CPU.
//
// Protocol (host → FPGA):
//   1. Send sync byte 0xAA
//   2. Send count byte N (0-31): number of nibbles to load
//   3. Send N data bytes; each byte's low 4 bits = one program nibble
//   After the last nibble is loaded, cpu_run goes high and the CPU begins.
//
// Reset protocol: send 0xFF to abort and return to BL_WAIT_SYNC.
//
// BAUD_DIV = 234 clocks per bit at 27 MHz = 115200 baud 8N1.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const BL_BAUD_DIV  = 234;
const BL_SYNC_BYTE = 0xAA;
const BL_RST_BYTE  = 0xFF;

enum BlRxSt {
    BLR_IDLE  = 0,
    BLR_START = 1,
    BLR_DATA  = 2,
    BLR_STOP  = 3
}

enum BlSt {
    BL_WAIT_SYNC = 0,
    BL_WAIT_LEN  = 1,
    BL_LOAD      = 2,
    BL_RUN       = 3
}

@Module
@ModuleConfig('resetSignal: "rst_n"')
class Nibble4Bootloader extends HardwareModule {
    @Input  clk:     Bit = 0;
    @Input  rst_n:   Bit = 1;
    @Input  uart_rx: Bit = 1;

    // Bootloader write interface to Nibble4Memory.
    @Output bl_wr_en:   Bit      = 0;
    @Output bl_wr_addr: Logic<5> = 0;
    @Output bl_wr_data: Logic<4> = 0;

    // When high, the CPU may start executing.
    @Output cpu_run: Bit = 0;

    // UART RX internals.
    private rx_state:   BlRxSt   = BlRxSt.BLR_IDLE;
    private rx_baud:    Logic<8> = 0;
    private rx_bit_idx: Logic<3> = 0;
    private rx_shift:   Logic<8> = 0;
    private rx_ready:   Bit      = 0;
    private rx_byte:    Logic<8> = 0;

    // Bootloader state.
    private bl_state:   BlSt     = BlSt.BL_WAIT_SYNC;
    private bl_count:   Logic<6> = 0;  // nibbles remaining to load
    private bl_loaded:  Logic<6> = 0;  // nibbles loaded so far

    @Sequential('clk')
    run(): void {
        this.rx_ready  = 0;
        this.bl_wr_en  = 0;

        // ---- UART RX FSM ----
        if (this.rx_state === BlRxSt.BLR_IDLE) {
            if (this.uart_rx === 0) {
                // Start bit detected.
                this.rx_state   = BlRxSt.BLR_START;
                this.rx_baud    = BL_BAUD_DIV >> 1;  // sample mid-bit
                this.rx_bit_idx = 0;
                this.rx_shift   = 0;
            }
        } else if (this.rx_state === BlRxSt.BLR_START) {
            if (this.rx_baud === 0) {
                this.rx_state = BlRxSt.BLR_DATA;
                this.rx_baud  = BL_BAUD_DIV;
            } else {
                this.rx_baud = this.rx_baud - 1;
            }
        } else if (this.rx_state === BlRxSt.BLR_DATA) {
            if (this.rx_baud === 0) {
                this.rx_shift   = (this.uart_rx << 7) | (this.rx_shift >> 1);
                this.rx_baud    = BL_BAUD_DIV;
                if (this.rx_bit_idx === 7) {
                    this.rx_state = BlRxSt.BLR_STOP;
                } else {
                    this.rx_bit_idx = this.rx_bit_idx + 1;
                }
            } else {
                this.rx_baud = this.rx_baud - 1;
            }
        } else if (this.rx_state === BlRxSt.BLR_STOP) {
            if (this.rx_baud === 0) {
                this.rx_ready = 1;
                this.rx_byte  = this.rx_shift;
                this.rx_state = BlRxSt.BLR_IDLE;
            } else {
                this.rx_baud = this.rx_baud - 1;
            }
        }

        // ---- Bootloader FSM ----
        if (this.rx_ready === 1) {
            if (this.rx_byte === BL_RST_BYTE) {
                // Abort: return to WAIT_SYNC, disable CPU.
                this.bl_state  = BlSt.BL_WAIT_SYNC;
                this.cpu_run   = 0;
                this.bl_loaded = 0;
            } else if (this.bl_state === BlSt.BL_WAIT_SYNC) {
                if (this.rx_byte === BL_SYNC_BYTE) {
                    this.bl_state = BlSt.BL_WAIT_LEN;
                }
            } else if (this.bl_state === BlSt.BL_WAIT_LEN) {
                this.bl_count  = this.rx_byte & 0x1F;
                this.bl_loaded = 0;
                if ((this.rx_byte & 0x1F) === 0) {
                    // Zero-length load: run immediately.
                    this.bl_state = BlSt.BL_RUN;
                    this.cpu_run  = 1;
                } else {
                    this.bl_state = BlSt.BL_LOAD;
                }
            } else if (this.bl_state === BlSt.BL_LOAD) {
                // Write the low nibble of the received byte into RAM.
                this.bl_wr_en   = 1;
                this.bl_wr_addr = this.bl_loaded & 0x1F;
                this.bl_wr_data = this.rx_byte & 0xF;
                if (this.bl_loaded === this.bl_count - 1) {
                    this.bl_loaded = 0;
                    this.bl_state  = BlSt.BL_RUN;
                    this.cpu_run   = 1;
                } else {
                    this.bl_loaded = this.bl_loaded + 1;
                }
            }
        }
    }
}

export { Nibble4Bootloader };
