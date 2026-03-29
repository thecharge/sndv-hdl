// aurora_uart_rx.ts - UART 8N1 receiver at 115200 baud for Tang Nano 20K.
//
// Receives bytes from the BL616 USB-UART bridge connected to FPGA pin 70
// (uart_rx in tang_nano_20k.board.json).  Outputs one byte per received frame
// as a 1-clock pulse on rx_valid together with the byte on rx_data.
//
// Protocol: 8N1, LSB-first, idle = logic 1.
// Timing at 27 MHz: BIT_PERIOD = 234 clocks (115200 baud, <0.2% error).
// Start-bit centre: wait HALF_PERIOD clocks after falling edge detection.
//
// State machine:
//   IDLE  -> START on falling edge (uart_rx goes 0)
//   START -> DATA  after HALF_PERIOD clocks if uart_rx still 0; else -> IDLE
//   DATA  -> STOP  after 8 × BIT_PERIOD sample clocks
//   STOP  -> IDLE  after BIT_PERIOD clocks; asserts rx_valid if stop bit = 1

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum RxSt { RX_IDLE = 0, RX_START = 1, RX_DATA = 2, RX_STOP = 3 }

const BIT_PERIOD  = 234;  // 27_000_000 / 115_200 ≈ 234 clocks
const HALF_PERIOD = 117;  // BIT_PERIOD / 2: sample centre of start bit
const BIT_LAST    = 233;  // BIT_PERIOD - 1
const HALF_LAST   = 116;  // HALF_PERIOD - 1
const BIT_IDX_MAX = 7;    // 8 data bits (0..7)

@Module
@ModuleConfig('resetSignal: "no_rst"')
class AuroraUartRx extends HardwareModule {
    @Input  clk:      Bit      = 0;
    @Input  uart_rx:  Bit      = 1;  // idle = 1; start bit = 0
    @Output rx_data:  Logic<8> = 0;  // received byte (valid when rx_valid = 1)
    @Output rx_valid: Bit      = 0;  // 1-clock pulse when byte is ready

    private state:    RxSt     = RxSt.RX_IDLE;
    private timer:    Logic<8> = 0;  // bit-period counter (max 233 < 256)
    private bitIdx:   Logic<3> = 0;  // current data bit index 0..7
    private shiftReg: Logic<8> = 0;  // receive shift register (LSB first)

    @Sequential('clk')
    tick(): void {
        this.rx_valid = 0;  // default: no valid output this clock

        switch (this.state) {
            case RxSt.RX_IDLE:
                if (this.uart_rx === 0) {
                    // Falling edge detected: start bit beginning
                    this.timer = 0;
                    this.state = RxSt.RX_START;
                }
                break;

            case RxSt.RX_START:
                // Wait HALF_PERIOD to reach the centre of the start bit.
                if (this.timer === HALF_LAST) {
                    if (this.uart_rx === 0) {
                        // Confirmed valid start bit: begin receiving data
                        this.timer    = 0;
                        this.bitIdx   = 0;
                        this.shiftReg = 0;
                        this.state    = RxSt.RX_DATA;
                    } else {
                        // Noise: abort and return to idle
                        this.state = RxSt.RX_IDLE;
                    }
                } else {
                    this.timer = this.timer + 1;
                }
                break;

            case RxSt.RX_DATA:
                // Sample each data bit at bit-period intervals.
                if (this.timer === BIT_LAST) {
                    this.timer = 0;
                    // Shift in received bit from MSB of uart_rx into bit 7, shift right.
                    if (this.uart_rx === 1) {
                        this.shiftReg = 0x80 | (this.shiftReg >> 1);
                    } else {
                        this.shiftReg = this.shiftReg >> 1;
                    }
                    if (this.bitIdx === BIT_IDX_MAX) {
                        this.state = RxSt.RX_STOP;
                    } else {
                        this.bitIdx = this.bitIdx + 1;
                    }
                } else {
                    this.timer = this.timer + 1;
                }
                break;

            case RxSt.RX_STOP:
                // Wait one full bit period to centre on the stop bit.
                if (this.timer === BIT_LAST) {
                    this.timer = 0;
                    if (this.uart_rx === 1) {
                        // Valid stop bit: output the received byte
                        this.rx_data  = this.shiftReg;
                        this.rx_valid = 1;
                    }
                    // Return to idle whether stop bit valid or not
                    this.state = RxSt.RX_IDLE;
                } else {
                    this.timer = this.timer + 1;
                }
                break;

            default:
                this.state = RxSt.RX_IDLE;
                break;
        }
    }
}

export { AuroraUartRx };
