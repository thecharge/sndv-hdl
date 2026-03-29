// uart_echo_tx.ts - UART 8N1 transmitter for the uart_echo diagnostic example.
//
// Identical logic to aurora_uart_tx / calc_uart_tx, with UET_ enum prefixes
// to stay globally unique within this compilation unit.
//
// Timing at 27 MHz: BIT_PERIOD = 234 clocks (115200 baud, <0.2% error).

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum UartEchoTxSt { UET_IDLE = 0, UET_STARTB = 1, UET_DATA = 2, UET_STOPB = 3 }

const UET_BIT_LAST = 233;   // BIT_PERIOD - 1
const UET_BIT_MAX  = 7;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class UartEchoTx extends HardwareModule {
    @Input  clk:      Bit      = 0;
    @Input  tx_data:  Logic<8> = 0;
    @Input  tx_valid: Bit      = 0;
    @Output uart_tx:  Bit      = 1;
    @Output tx_ready: Bit      = 1;

    private txSt:       UartEchoTxSt = UartEchoTxSt.UET_IDLE;
    private txTimer:    Logic<8>     = 0;
    private txBitIdx:   Logic<3>     = 0;
    private txShiftReg: Logic<8>     = 0;

    @Sequential('clk')
    tick(): void {
        switch (this.txSt) {
            case UartEchoTxSt.UET_IDLE:
                this.uart_tx  = 1;
                this.tx_ready = 1;
                if (this.tx_valid === 1) {
                    this.txShiftReg = this.tx_data;
                    this.txTimer    = 0;
                    this.txBitIdx   = 0;
                    this.tx_ready   = 0;
                    this.txSt       = UartEchoTxSt.UET_STARTB;
                }
                break;

            case UartEchoTxSt.UET_STARTB:
                this.uart_tx  = 0;
                this.tx_ready = 0;
                if (this.txTimer === UET_BIT_LAST) {
                    this.txTimer = 0;
                    this.txSt    = UartEchoTxSt.UET_DATA;
                } else {
                    this.txTimer = this.txTimer + 1;
                }
                break;

            case UartEchoTxSt.UET_DATA:
                if ((this.txShiftReg & 1) === 1) {
                    this.uart_tx = 1;
                } else {
                    this.uart_tx = 0;
                }
                this.tx_ready = 0;
                if (this.txTimer === UET_BIT_LAST) {
                    this.txShiftReg = this.txShiftReg >> 1;
                    this.txTimer    = 0;
                    if (this.txBitIdx === UET_BIT_MAX) {
                        this.txSt = UartEchoTxSt.UET_STOPB;
                    } else {
                        this.txBitIdx = this.txBitIdx + 1;
                    }
                } else {
                    this.txTimer = this.txTimer + 1;
                }
                break;

            case UartEchoTxSt.UET_STOPB:
                this.uart_tx  = 1;
                this.tx_ready = 0;
                if (this.txTimer === UET_BIT_LAST) {
                    this.txTimer  = 0;
                    this.tx_ready = 1;
                    this.txSt     = UartEchoTxSt.UET_IDLE;
                } else {
                    this.txTimer = this.txTimer + 1;
                }
                break;

            default:
                this.txSt = UartEchoTxSt.UET_IDLE;
                break;
        }
    }
}

export { UartEchoTx };
