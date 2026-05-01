// tpu_uart_rx.ts - UART 8N1 receiver for tpu_uart example.
// TPU_RX_ enum prefixes ensure global uniqueness in multi-file compilation.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum TpuRxSt { TPU_RX_IDLE = 0, TPU_RX_START = 1, TPU_RX_DATA = 2, TPU_RX_STOP = 3 }

const TPU_RX_BIT_LAST  = 233;
const TPU_RX_HALF_LAST = 116;
const TPU_RX_BIT_MAX   = 7;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class TpuUartRx extends HardwareModule {
    @Input  clk:      Bit      = 0;
    @Input  uart_rx:  Bit      = 1;
    @Output rx_data:  Logic<8> = 0;
    @Output rx_valid: Bit      = 0;

    private rxSt:    TpuRxSt  = TpuRxSt.TPU_RX_IDLE;
    private rxTimer: Logic<8> = 0;
    private rxBitI:  Logic<3> = 0;
    private rxShift: Logic<8> = 0;

    @Sequential('clk')
    tick(): void {
        this.rx_valid = 0;
        switch (this.rxSt) {
            case TpuRxSt.TPU_RX_IDLE:
                if (this.uart_rx === 0) {
                    this.rxTimer = 0;
                    this.rxSt    = TpuRxSt.TPU_RX_START;
                }
                break;
            case TpuRxSt.TPU_RX_START:
                if (this.rxTimer === TPU_RX_HALF_LAST) {
                    if (this.uart_rx === 0) {
                        this.rxTimer = 0;
                        this.rxBitI  = 0;
                        this.rxShift = 0;
                        this.rxSt    = TpuRxSt.TPU_RX_DATA;
                    } else {
                        this.rxSt = TpuRxSt.TPU_RX_IDLE;
                    }
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;
            case TpuRxSt.TPU_RX_DATA:
                if (this.rxTimer === TPU_RX_BIT_LAST) {
                    this.rxTimer = 0;
                    if (this.uart_rx === 1) {
                        this.rxShift = 0x80 | (this.rxShift >> 1);
                    } else {
                        this.rxShift = this.rxShift >> 1;
                    }
                    if (this.rxBitI === TPU_RX_BIT_MAX) {
                        this.rxSt = TpuRxSt.TPU_RX_STOP;
                    } else {
                        this.rxBitI = this.rxBitI + 1;
                    }
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;
            case TpuRxSt.TPU_RX_STOP:
                if (this.rxTimer === TPU_RX_BIT_LAST) {
                    this.rxTimer = 0;
                    if (this.uart_rx === 1) {
                        this.rx_data  = this.rxShift;
                        this.rx_valid = 1;
                    }
                    this.rxSt = TpuRxSt.TPU_RX_IDLE;
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;
            default:
                this.rxSt = TpuRxSt.TPU_RX_IDLE;
                break;
        }
    }
}

export { TpuUartRx };
