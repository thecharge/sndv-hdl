// uart_echo_rx.ts - UART 8N1 receiver for the uart_echo diagnostic example.
//
// Identical logic to aurora_uart_rx / calc_uart_rx, with UER_ enum prefixes
// to stay globally unique within this compilation unit.
//
// Timing at 27 MHz: BIT_PERIOD = 234 clocks (115200 baud, <0.2% error).

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum UartEchoRxSt { UER_IDLE = 0, UER_START = 1, UER_DATA = 2, UER_STOP = 3 }

const UER_BIT_LAST  = 233;   // BIT_PERIOD - 1
const UER_HALF_LAST = 116;   // HALF_PERIOD - 1
const UER_BIT_MAX   = 7;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class UartEchoRx extends HardwareModule {
    @Input  clk:      Bit      = 0;
    @Input  uart_rx:  Bit      = 1;
    @Output rx_data:  Logic<8> = 0;
    @Output rx_valid: Bit      = 0;

    private rxSt:       UartEchoRxSt = UartEchoRxSt.UER_IDLE;
    private rxTimer:    Logic<8>     = 0;
    private rxBitIdx:   Logic<3>     = 0;
    private rxShiftReg: Logic<8>     = 0;

    @Sequential('clk')
    tick(): void {
        this.rx_valid = 0;

        switch (this.rxSt) {
            case UartEchoRxSt.UER_IDLE:
                if (this.uart_rx === 0) {
                    this.rxTimer = 0;
                    this.rxSt    = UartEchoRxSt.UER_START;
                }
                break;

            case UartEchoRxSt.UER_START:
                if (this.rxTimer === UER_HALF_LAST) {
                    if (this.uart_rx === 0) {
                        this.rxTimer    = 0;
                        this.rxBitIdx   = 0;
                        this.rxShiftReg = 0;
                        this.rxSt       = UartEchoRxSt.UER_DATA;
                    } else {
                        this.rxSt = UartEchoRxSt.UER_IDLE;
                    }
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;

            case UartEchoRxSt.UER_DATA:
                if (this.rxTimer === UER_BIT_LAST) {
                    this.rxTimer = 0;
                    if (this.uart_rx === 1) {
                        this.rxShiftReg = 0x80 | (this.rxShiftReg >> 1);
                    } else {
                        this.rxShiftReg = this.rxShiftReg >> 1;
                    }
                    if (this.rxBitIdx === UER_BIT_MAX) {
                        this.rxSt = UartEchoRxSt.UER_STOP;
                    } else {
                        this.rxBitIdx = this.rxBitIdx + 1;
                    }
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;

            case UartEchoRxSt.UER_STOP:
                if (this.rxTimer === UER_BIT_LAST) {
                    this.rxTimer = 0;
                    if (this.uart_rx === 1) {
                        this.rx_data  = this.rxShiftReg;
                        this.rx_valid = 1;
                    }
                    this.rxSt = UartEchoRxSt.UER_IDLE;
                } else {
                    this.rxTimer = this.rxTimer + 1;
                }
                break;

            default:
                this.rxSt = UartEchoRxSt.UER_IDLE;
                break;
        }
    }
}

export { UartEchoRx };
