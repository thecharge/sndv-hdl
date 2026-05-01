// matrix_uart_tx.ts - UART 8N1 transmitter for matrix_uart example.
// MXT_ enum prefixes ensure global uniqueness in multi-file compilation.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum MxTxSt { MXT_IDLE = 0, MXT_START = 1, MXT_DATA = 2, MXT_STOP = 3 }

const MXT_BIT_LAST = 233;
const MXT_BIT_MAX  = 7;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class MatrixUartTx extends HardwareModule {
    @Input  clk:      Bit      = 0;
    @Input  tx_data:  Logic<8> = 0;
    @Input  tx_valid: Bit      = 0;
    @Output uart_tx:  Bit      = 1;
    @Output tx_ready: Bit      = 1;

    private txSt:    MxTxSt  = MxTxSt.MXT_IDLE;
    private txTimer: Logic<8> = 0;
    private txBitI:  Logic<3> = 0;
    private txShift: Logic<8> = 0;

    @Sequential('clk')
    tick(): void {
        switch (this.txSt) {
            case MxTxSt.MXT_IDLE:
                this.uart_tx  = 1;
                this.tx_ready = 1;
                if (this.tx_valid === 1) {
                    this.txShift = this.tx_data;
                    this.txTimer = 0;
                    this.txBitI  = 0;
                    this.tx_ready = 0;
                    this.txSt    = MxTxSt.MXT_START;
                }
                break;
            case MxTxSt.MXT_START:
                this.uart_tx  = 0;
                this.tx_ready = 0;
                if (this.txTimer === MXT_BIT_LAST) {
                    this.txTimer = 0;
                    this.txSt    = MxTxSt.MXT_DATA;
                } else {
                    this.txTimer = this.txTimer + 1;
                }
                break;
            case MxTxSt.MXT_DATA:
                if ((this.txShift & 1) === 1) {
                    this.uart_tx = 1;
                } else {
                    this.uart_tx = 0;
                }
                this.tx_ready = 0;
                if (this.txTimer === MXT_BIT_LAST) {
                    this.txShift = this.txShift >> 1;
                    this.txTimer = 0;
                    if (this.txBitI === MXT_BIT_MAX) {
                        this.txSt = MxTxSt.MXT_STOP;
                    } else {
                        this.txBitI = this.txBitI + 1;
                    }
                } else {
                    this.txTimer = this.txTimer + 1;
                }
                break;
            case MxTxSt.MXT_STOP:
                this.uart_tx  = 1;
                this.tx_ready = 0;
                if (this.txTimer === MXT_BIT_LAST) {
                    this.txTimer  = 0;
                    this.tx_ready = 1;
                    this.txSt     = MxTxSt.MXT_IDLE;
                } else {
                    this.txTimer = this.txTimer + 1;
                }
                break;
            default:
                this.txSt = MxTxSt.MXT_IDLE;
                break;
        }
    }
}

export { MatrixUartTx };
