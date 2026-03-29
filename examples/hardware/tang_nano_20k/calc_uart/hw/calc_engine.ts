// calc_engine.ts - UART calculator engine for Tang Nano 20K.
//
// Receives 3 bytes from the host:
//   byte 0: operation  (0 = add, 1 = sub, 2 = mul)
//   byte 1: operand A  (8-bit unsigned, 0..255)
//   byte 2: operand B  (8-bit unsigned, 0..255)
//
// Computes the result (16-bit to handle mul overflow, max 255*255 = 65025).
//
// Sends 2 bytes back to the host:
//   byte 0: result high byte  (result[15:8])
//   byte 1: result low byte   (result[7:0])
//
// State machine:
//   CE_WAIT_OP  -> CE_WAIT_A   on rx_valid (latch op)
//   CE_WAIT_A   -> CE_WAIT_B   on rx_valid (latch A)
//   CE_WAIT_B   -> CE_COMPUTE  on rx_valid (latch B)
//   CE_COMPUTE  -> CE_SEND_HI  (one-clock compute; TX must be idle at this point)
//   CE_SEND_HI  -> CE_HOLD     assert tx_valid for high byte when tx_ready=1
//   CE_HOLD     -> CE_SEND_LO  one-clock gap so TX latches and drops tx_ready
//   CE_SEND_LO  -> CE_WAIT_OP  assert tx_valid for low byte when tx_ready=1
//
// The CE_HOLD state is required because non-blocking assignment semantics mean
// tx_ready appears still 1 on the clock immediately after CE_SEND_HI fires.
// CE_HOLD gives TX one clock to accept the byte and assert tx_ready=0 before
// CE_SEND_LO re-checks it.

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum CalcSt {
    CE_WAIT_OP = 0,
    CE_WAIT_A  = 1,
    CE_WAIT_B  = 2,
    CE_COMPUTE = 3,
    CE_SEND_HI = 4,
    CE_HOLD    = 5,
    CE_SEND_LO = 6,
}

const OP_ADD = 0;
const OP_SUB = 1;
const OP_MUL = 2;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class CalcEngine extends HardwareModule {
    @Input  clk:      Bit       = 0;
    @Input  rx_data:  Logic<8>  = 0;
    @Input  rx_valid: Bit       = 0;
    @Input  tx_ready: Bit       = 1;
    @Output tx_data:  Logic<8>  = 0;
    @Output tx_valid: Bit       = 0;

    private ceState: CalcSt    = CalcSt.CE_WAIT_OP;
    private ceOp:    Logic<2>  = 0;
    private ceA:     Logic<8>  = 0;
    private ceB:     Logic<8>  = 0;
    private ceResult: Logic<16> = 0;

    @Sequential('clk')
    tick(): void {
        this.tx_valid = 0;

        switch (this.ceState) {
            case CalcSt.CE_WAIT_OP:
                if (this.rx_valid === 1) {
                    this.ceOp    = this.rx_data & 3;
                    this.ceState = CalcSt.CE_WAIT_A;
                }
                break;

            case CalcSt.CE_WAIT_A:
                if (this.rx_valid === 1) {
                    this.ceA     = this.rx_data;
                    this.ceState = CalcSt.CE_WAIT_B;
                }
                break;

            case CalcSt.CE_WAIT_B:
                if (this.rx_valid === 1) {
                    this.ceB     = this.rx_data;
                    this.ceState = CalcSt.CE_COMPUTE;
                }
                break;

            case CalcSt.CE_COMPUTE:
                if (this.ceOp === OP_ADD) {
                    this.ceResult = this.ceA + this.ceB;
                } else if (this.ceOp === OP_SUB) {
                    this.ceResult = this.ceA - this.ceB;
                } else {
                    this.ceResult = this.ceA * this.ceB;
                }
                this.ceState = CalcSt.CE_SEND_HI;
                break;

            case CalcSt.CE_SEND_HI:
                // TX should be idle here (previous transaction finished long ago).
                // Verify tx_ready as a safety check.
                if (this.tx_ready === 1) {
                    this.tx_data  = (this.ceResult >> 8) & 0xFF;
                    this.tx_valid = 1;
                    this.ceState  = CalcSt.CE_HOLD;
                }
                break;

            case CalcSt.CE_HOLD:
                // One-clock gap: TX is now latching the high byte and will
                // deassert tx_ready.  Do nothing; just advance to CE_SEND_LO.
                this.ceState = CalcSt.CE_SEND_LO;
                break;

            case CalcSt.CE_SEND_LO:
                // Wait for TX to finish sending the high byte.
                if (this.tx_ready === 1) {
                    this.tx_data  = this.ceResult & 0xFF;
                    this.tx_valid = 1;
                    this.ceState  = CalcSt.CE_WAIT_OP;
                }
                break;

            default:
                this.ceState = CalcSt.CE_WAIT_OP;
                break;
        }
    }
}

export { CalcEngine };
