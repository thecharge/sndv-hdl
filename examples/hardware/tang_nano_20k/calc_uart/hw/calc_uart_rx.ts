// calc_uart_rx.ts - UART 8N1 receiver at 115200 baud for calc_uart example.
//
// Identical logic to aurora_uart_rx but with CRX_ enum prefixes to ensure
// enum member names are globally unique across the multi-file design.
//
// Timing at 27 MHz: BIT_PERIOD = 234 clocks (115200 baud, <0.2% error).

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum CalcRxSt { CRX_IDLE = 0, CRX_START = 1, CRX_DATA = 2, CRX_STOP = 3 }

const CRX_BIT_PERIOD  = 234;
const CRX_HALF_PERIOD = 117;
const CRX_BIT_LAST    = 233;
const CRX_HALF_LAST   = 116;
const CRX_BIT_MAX     = 7;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class CalcUartRx extends HardwareModule {
    @Input  clk:      Bit      = 0;
    @Input  uart_rx:  Bit      = 1;
    @Output rx_data:  Logic<8> = 0;
    @Output rx_valid: Bit      = 0;

    private rxState:    CalcRxSt = CalcRxSt.CRX_IDLE;
    private rxTimer:    Logic<8> = 0;
    private rxBitIdx:   Logic<3> = 0;
    private rxShiftReg: Logic<8> = 0;

    @Sequential('clk')
    tick(): void {
        this.rx_valid = 0;

        switch (this.rxState) {
            case CalcRxSt.CRX_IDLE:
                if (this.uart_rx === 0) {
                    this.rxTimer = 0;
                    this.rxState = CalcRxSt.CRX_START;
                }
                break;

            case CalcRxSt.CRX_START:
                if (this.rxTimer === CRX_HALF_LAST) {
                    if (this.uart_rx === 0) {
                        this.rxTimer    = 0;
                        this.rxBitIdx   = 0;
                        this.rxShiftReg = 0;
                        this.rxState    = CalcRxSt.CRX_DATA;
                    } else {
                        this.rxState = CalcRxSt.CRX_IDLE;
                    }
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;

            case CalcRxSt.CRX_DATA:
                if (this.rxTimer === CRX_BIT_LAST) {
                    this.rxTimer = 0;
                    if (this.uart_rx === 1) {
                        this.rxShiftReg = 0x80 | (this.rxShiftReg >> 1);
                    } else {
                        this.rxShiftReg = this.rxShiftReg >> 1;
                    }
                    if (this.rxBitIdx === CRX_BIT_MAX) {
                        this.rxState = CalcRxSt.CRX_STOP;
                    } else {
                        this.rxBitIdx = this.rxBitIdx + 1;
                    }
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;

            case CalcRxSt.CRX_STOP:
                if (this.rxTimer === CRX_BIT_LAST) {
                    this.rxTimer = 0;
                    if (this.uart_rx === 1) {
                        this.rx_data  = this.rxShiftReg;
                        this.rx_valid = 1;
                    }
                    this.rxState = CalcRxSt.CRX_IDLE;
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;

            default:
                this.rxState = CalcRxSt.CRX_IDLE;
                break;
        }
    }
}

export { CalcUartRx };
