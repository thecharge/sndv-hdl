// calc_uart_tx.ts - UART 8N1 transmitter at 115200 baud for calc_uart example.
//
// Identical logic to aurora_uart_tx but with CTX_ enum prefixes to ensure
// enum member names are globally unique across the multi-file design.
//
// Timing at 27 MHz: BIT_PERIOD = 234 clocks (115200 baud, <0.2% error).

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum CalcTxSt { CTX_IDLE = 0, CTX_STARTB = 1, CTX_DATA = 2, CTX_STOPB = 3 }

const CTX_BIT_LAST = 233;
const CTX_BIT_MAX  = 7;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class CalcUartTx extends HardwareModule {
    @Input  clk:      Bit      = 0;
    @Input  tx_data:  Logic<8> = 0;
    @Input  tx_valid: Bit      = 0;
    @Output uart_tx:  Bit      = 1;
    @Output tx_ready: Bit      = 1;

    private txState:    CalcTxSt = CalcTxSt.CTX_IDLE;
    private txTimer:    Logic<8> = 0;
    private txBitIdx:   Logic<3> = 0;
    private txShiftReg: Logic<8> = 0;

    @Sequential('clk')
    tick(): void {
        switch (this.txState) {
            case CalcTxSt.CTX_IDLE:
                this.uart_tx  = 1;
                this.tx_ready = 1;
                if (this.tx_valid === 1) {
                    this.txShiftReg = this.tx_data;
                    this.txTimer    = 0;
                    this.txBitIdx   = 0;
                    this.tx_ready   = 0;
                    this.txState    = CalcTxSt.CTX_STARTB;
                }
                break;

            case CalcTxSt.CTX_STARTB:
                this.uart_tx  = 0;
                this.tx_ready = 0;
                if (this.txTimer === CTX_BIT_LAST) {
                    this.txTimer = 0;
                    this.txState = CalcTxSt.CTX_DATA;
                } else {
                    this.txTimer = this.txTimer + 1;
                }
                break;

            case CalcTxSt.CTX_DATA:
                if ((this.txShiftReg & 1) === 1) {
                    this.uart_tx = 1;
                } else {
                    this.uart_tx = 0;
                }
                this.tx_ready = 0;
                if (this.txTimer === CTX_BIT_LAST) {
                    this.txShiftReg = this.txShiftReg >> 1;
                    this.txTimer    = 0;
                    if (this.txBitIdx === CTX_BIT_MAX) {
                        this.txState = CalcTxSt.CTX_STOPB;
                    } else {
                        this.txBitIdx = this.txBitIdx + 1;
                    }
                } else {
                    this.txTimer = this.txTimer + 1;
                }
                break;

            case CalcTxSt.CTX_STOPB:
                this.uart_tx  = 1;
                this.tx_ready = 0;
                if (this.txTimer === CTX_BIT_LAST) {
                    this.txTimer  = 0;
                    this.tx_ready = 1;
                    this.txState  = CalcTxSt.CTX_IDLE;
                } else {
                    this.txTimer = this.txTimer + 1;
                }
                break;

            default:
                this.txState = CalcTxSt.CTX_IDLE;
                break;
        }
    }
}

export { CalcUartTx };
