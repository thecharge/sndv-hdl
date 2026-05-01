// matrix_uart_rx.ts - UART 8N1 receiver for matrix_uart example.
// MXR_ enum prefixes ensure global uniqueness in multi-file compilation.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum MxRxSt { MXR_IDLE = 0, MXR_START = 1, MXR_DATA = 2, MXR_STOP = 3 }

const MXR_BIT_LAST  = 233;
const MXR_HALF_LAST = 116;
const MXR_BIT_MAX   = 7;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class MatrixUartRx extends HardwareModule {
    @Input  clk:      Bit      = 0;
    @Input  uart_rx:  Bit      = 1;
    @Output rx_data:  Logic<8> = 0;
    @Output rx_valid: Bit      = 0;

    private rxSt:    MxRxSt  = MxRxSt.MXR_IDLE;
    private rxTimer: Logic<8> = 0;
    private rxBitI:  Logic<3> = 0;
    private rxShift: Logic<8> = 0;

    @Sequential('clk')
    tick(): void {
        this.rx_valid = 0;
        switch (this.rxSt) {
            case MxRxSt.MXR_IDLE:
                if (this.uart_rx === 0) {
                    this.rxTimer = 0;
                    this.rxSt    = MxRxSt.MXR_START;
                }
                break;
            case MxRxSt.MXR_START:
                if (this.rxTimer === MXR_HALF_LAST) {
                    if (this.uart_rx === 0) {
                        this.rxTimer = 0;
                        this.rxBitI  = 0;
                        this.rxShift = 0;
                        this.rxSt    = MxRxSt.MXR_DATA;
                    } else {
                        this.rxSt = MxRxSt.MXR_IDLE;
                    }
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;
            case MxRxSt.MXR_DATA:
                if (this.rxTimer === MXR_BIT_LAST) {
                    this.rxTimer = 0;
                    if (this.uart_rx === 1) {
                        this.rxShift = 0x80 | (this.rxShift >> 1);
                    } else {
                        this.rxShift = this.rxShift >> 1;
                    }
                    if (this.rxBitI === MXR_BIT_MAX) {
                        this.rxSt = MxRxSt.MXR_STOP;
                    } else {
                        this.rxBitI = this.rxBitI + 1;
                    }
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;
            case MxRxSt.MXR_STOP:
                if (this.rxTimer === MXR_BIT_LAST) {
                    this.rxTimer = 0;
                    if (this.uart_rx === 1) {
                        this.rx_data  = this.rxShift;
                        this.rx_valid = 1;
                    }
                    this.rxSt = MxRxSt.MXR_IDLE;
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;
            default:
                this.rxSt = MxRxSt.MXR_IDLE;
                break;
        }
    }
}

export { MatrixUartRx };
