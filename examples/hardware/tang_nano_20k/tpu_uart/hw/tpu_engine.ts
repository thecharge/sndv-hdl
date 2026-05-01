// tpu_engine.ts - TPU operations: dot product, MAC accumulator, ReLU, reset_acc.
//
// Operations (op byte):
//   0 dot:       result = a0*b0+a1*b1+a2*b2+a3*b3  (acc unchanged)
//   1 mac:       acc += dot; result = new acc
//   2 relu:      result = acc if acc < 0x8000 else 0; acc set to result
//   3 reset_acc: acc = 0; result = 0
//
// Protocol:
//   Host -> FPGA: byte 0 = op; for dot/mac: 8 more bytes a0..a3 then b0..b3
//   FPGA -> Host: 2 bytes big-endian 16-bit result

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum TpuEngSt {
    TE_WAIT_OP = 0,
    TE_WAIT_A0 = 1,
    TE_WAIT_A1 = 2,
    TE_WAIT_A2 = 3,
    TE_WAIT_A3 = 4,
    TE_WAIT_B0 = 5,
    TE_WAIT_B1 = 6,
    TE_WAIT_B2 = 7,
    TE_WAIT_B3 = 8,
    TE_COMPUTE = 9,
    TE_SEND_HI = 10,
    TE_HOLD    = 11,
    TE_SEND_LO = 12
}

const TE_OP_DOT  = 0;
const TE_OP_MAC  = 1;
const TE_OP_RELU = 2;

@Module
@ModuleConfig('resetSignal: "no_rst"')
class TpuEngine extends HardwareModule {
    @Input  clk:      Bit      = 0;
    @Input  rx_data:  Logic<8> = 0;
    @Input  rx_valid: Bit      = 0;
    @Input  tx_ready: Bit      = 1;
    @Output tx_data:  Logic<8> = 0;
    @Output tx_valid: Bit      = 0;

    private teSt:     TpuEngSt = TpuEngSt.TE_WAIT_OP;
    private teOp:     Logic<2>  = 0;
    private teA0:     Logic<8>  = 0;
    private teA1:     Logic<8>  = 0;
    private teA2:     Logic<8>  = 0;
    private teA3:     Logic<8>  = 0;
    private teB0:     Logic<8>  = 0;
    private teB1:     Logic<8>  = 0;
    private teB2:     Logic<8>  = 0;
    private teB3:     Logic<8>  = 0;
    private teAcc:    Logic<16> = 0;
    private teResult: Logic<16> = 0;

    @Sequential('clk')
    tick(): void {
        this.tx_valid = 0;

        switch (this.teSt) {
            case TpuEngSt.TE_WAIT_OP:
                if (this.rx_valid === 1) {
                    this.teOp = this.rx_data & 3;
                    if ((this.rx_data & 3) === TE_OP_DOT) {
                        this.teSt = TpuEngSt.TE_WAIT_A0;
                    } else if ((this.rx_data & 3) === TE_OP_MAC) {
                        this.teSt = TpuEngSt.TE_WAIT_A0;
                    } else {
                        this.teSt = TpuEngSt.TE_COMPUTE;
                    }
                }
                break;

            case TpuEngSt.TE_WAIT_A0:
                if (this.rx_valid === 1) {
                    this.teA0 = this.rx_data;
                    this.teSt = TpuEngSt.TE_WAIT_A1;
                }
                break;

            case TpuEngSt.TE_WAIT_A1:
                if (this.rx_valid === 1) {
                    this.teA1 = this.rx_data;
                    this.teSt = TpuEngSt.TE_WAIT_A2;
                }
                break;

            case TpuEngSt.TE_WAIT_A2:
                if (this.rx_valid === 1) {
                    this.teA2 = this.rx_data;
                    this.teSt = TpuEngSt.TE_WAIT_A3;
                }
                break;

            case TpuEngSt.TE_WAIT_A3:
                if (this.rx_valid === 1) {
                    this.teA3 = this.rx_data;
                    this.teSt = TpuEngSt.TE_WAIT_B0;
                }
                break;

            case TpuEngSt.TE_WAIT_B0:
                if (this.rx_valid === 1) {
                    this.teB0 = this.rx_data;
                    this.teSt = TpuEngSt.TE_WAIT_B1;
                }
                break;

            case TpuEngSt.TE_WAIT_B1:
                if (this.rx_valid === 1) {
                    this.teB1 = this.rx_data;
                    this.teSt = TpuEngSt.TE_WAIT_B2;
                }
                break;

            case TpuEngSt.TE_WAIT_B2:
                if (this.rx_valid === 1) {
                    this.teB2 = this.rx_data;
                    this.teSt = TpuEngSt.TE_WAIT_B3;
                }
                break;

            case TpuEngSt.TE_WAIT_B3:
                if (this.rx_valid === 1) {
                    this.teB3 = this.rx_data;
                    this.teSt = TpuEngSt.TE_COMPUTE;
                }
                break;

            case TpuEngSt.TE_COMPUTE:
                if (this.teOp === TE_OP_DOT) {
                    this.teResult = (this.teA0 * this.teB0) + (this.teA1 * this.teB1) + (this.teA2 * this.teB2) + (this.teA3 * this.teB3);
                } else if (this.teOp === TE_OP_MAC) {
                    // Non-blocking: both RHS use teAcc_old + dot = new acc value
                    this.teAcc    = this.teAcc + (this.teA0 * this.teB0) + (this.teA1 * this.teB1) + (this.teA2 * this.teB2) + (this.teA3 * this.teB3);
                    this.teResult = this.teAcc + (this.teA0 * this.teB0) + (this.teA1 * this.teB1) + (this.teA2 * this.teB2) + (this.teA3 * this.teB3);
                } else if (this.teOp === TE_OP_RELU) {
                    if (this.teAcc >= 0x8000) {
                        this.teResult = 0;
                        this.teAcc    = 0;
                    } else {
                        this.teResult = this.teAcc;
                    }
                } else {
                    this.teAcc    = 0;
                    this.teResult = 0;
                }
                this.teSt = TpuEngSt.TE_SEND_HI;
                break;

            case TpuEngSt.TE_SEND_HI:
                if (this.tx_ready === 1) {
                    this.tx_data  = (this.teResult >> 8) & 0xFF;
                    this.tx_valid = 1;
                    this.teSt     = TpuEngSt.TE_HOLD;
                }
                break;

            case TpuEngSt.TE_HOLD:
                // One-clock gap: TX latches the high byte and deasserts tx_ready.
                this.teSt = TpuEngSt.TE_SEND_LO;
                break;

            case TpuEngSt.TE_SEND_LO:
                if (this.tx_ready === 1) {
                    this.tx_data  = this.teResult & 0xFF;
                    this.tx_valid = 1;
                    this.teSt     = TpuEngSt.TE_WAIT_OP;
                }
                break;

            default:
                this.teSt = TpuEngSt.TE_WAIT_OP;
                break;
        }
    }
}

export { TpuEngine };
