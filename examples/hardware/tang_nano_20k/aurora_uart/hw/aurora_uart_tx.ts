// aurora_uart_tx.ts - UART 8N1 transmitter at 115200 baud for Tang Nano 20K.
//
// Sends bytes to the FTDI2232H USB-UART bridge on FPGA pin 15
// (uart_tx in tang_nano_20k.board.json).  One byte is queued via the
// tx_data + tx_valid handshake; tx_ready = 1 when IDLE (ready to accept).
//
// Protocol: 8N1, LSB-first, idle = logic 1.
// Timing at 27 MHz: BIT_PERIOD = 234 clocks.
//
// State machine:
//   IDLE  -> STARTB  on tx_valid = 1 (latch tx_data into shift register)
//   STARTB -> DATA   after BIT_PERIOD (start bit complete)
//   DATA   -> STOPB  after 8 × BIT_PERIOD (all data bits sent)
//   STOPB  -> IDLE   after BIT_PERIOD (stop bit complete)

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum TxSt { TX_IDLE = 0, TX_STARTB = 1, TX_DATA = 2, TX_STOPB = 3 }

const TX_BIT_PERIOD = 234;
const TX_BIT_LAST   = 233;  // BIT_PERIOD - 1
const TX_BIT_MAX    = 7;    // 8 data bits (0..7)

@Module
@ModuleConfig('resetSignal: "no_rst"')
class AuroraUartTx extends HardwareModule {
    @Input  clk:      Bit      = 0;
    @Input  tx_data:  Logic<8> = 0;  // byte to send (latch on tx_valid)
    @Input  tx_valid: Bit      = 0;  // pulse 1 clock to enqueue tx_data
    @Output uart_tx:  Bit      = 1;  // serial output; idle = 1
    @Output tx_ready: Bit      = 1;  // 1 when IDLE and ready to accept

    private state:    TxSt     = TxSt.TX_IDLE;
    private timer:    Logic<8> = 0;
    private bitIdx:   Logic<3> = 0;
    private shiftReg: Logic<8> = 0;

    @Sequential('clk')
    tick(): void {
        switch (this.state) {
            case TxSt.TX_IDLE:
                this.uart_tx  = 1;
                this.tx_ready = 1;
                if (this.tx_valid === 1) {
                    this.shiftReg = this.tx_data;
                    this.timer    = 0;
                    this.bitIdx   = 0;
                    this.tx_ready = 0;
                    this.state    = TxSt.TX_STARTB;
                }
                break;

            case TxSt.TX_STARTB:
                this.uart_tx  = 0;  // start bit (space)
                this.tx_ready = 0;
                if (this.timer === TX_BIT_LAST) {
                    this.timer = 0;
                    this.state = TxSt.TX_DATA;
                } else {
                    this.timer = this.timer + 1;
                }
                break;

            case TxSt.TX_DATA:
                // Output LSB of shift register.
                if ((this.shiftReg & 1) === 1) {
                    this.uart_tx = 1;
                } else {
                    this.uart_tx = 0;
                }
                this.tx_ready = 0;
                if (this.timer === TX_BIT_LAST) {
                    this.shiftReg = this.shiftReg >> 1;
                    this.timer    = 0;
                    if (this.bitIdx === TX_BIT_MAX) {
                        this.state = TxSt.TX_STOPB;
                    } else {
                        this.bitIdx = this.bitIdx + 1;
                    }
                } else {
                    this.timer = this.timer + 1;
                }
                break;

            case TxSt.TX_STOPB:
                this.uart_tx  = 1;  // stop bit (mark)
                this.tx_ready = 0;
                if (this.timer === TX_BIT_LAST) {
                    this.timer    = 0;
                    this.tx_ready = 1;
                    this.state    = TxSt.TX_IDLE;
                } else {
                    this.timer = this.timer + 1;
                }
                break;

            default:
                this.state = TxSt.TX_IDLE;
                break;
        }
    }
}

export { AuroraUartTx };
