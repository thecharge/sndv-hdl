// matrix_top.ts - 4x4 matrix multiply over UART for Tang Nano 20K.
// Protocol: send 64 bytes (two flattened 4x4 uint8 matrices A then B),
// receive 32 bytes (flattened 16-element uint16 result, little-endian).
//
// Compile:
//   bun run apps/cli/src/index.ts compile \
//     examples/hardware/tang_nano_20k/matrix_uart/hw \
//     --board boards/tang_nano_20k.board.json \
//     --out .artifacts/matrix_uart

import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum MxTopSt {
    MXT_WAIT_A = 0,  // receiving 16 bytes for matrix A
    MXT_WAIT_B = 1,  // receiving 16 bytes for matrix B
    MXT_SEND   = 2   // sending 32 bytes result
}

const MX_A_COUNT  = 15;  // 0..15 = 16 bytes
const MX_AB_COUNT = 31;  // 16..31 = 16 bytes for B

@Module
@ModuleConfig('resetSignal: "no_rst"')
class MatrixTop extends HardwareModule {
    @Input  clk:     Bit = 0;
    @Input  uart_rx: Bit = 1;
    @Output uart_tx: Bit = 1;
    @Output led:     Logic<6> = 0x3F;

    // Matrix A elements (stored as 16-bit for engine input)
    private a0:  Logic<16> = 0; private a1:  Logic<16> = 0; private a2:  Logic<16> = 0; private a3:  Logic<16> = 0;
    private a4:  Logic<16> = 0; private a5:  Logic<16> = 0; private a6:  Logic<16> = 0; private a7:  Logic<16> = 0;
    private a8:  Logic<16> = 0; private a9:  Logic<16> = 0; private a10: Logic<16> = 0; private a11: Logic<16> = 0;
    private a12: Logic<16> = 0; private a13: Logic<16> = 0; private a14: Logic<16> = 0; private a15: Logic<16> = 0;

    // Matrix B elements
    private b0:  Logic<16> = 0; private b1:  Logic<16> = 0; private b2:  Logic<16> = 0; private b3:  Logic<16> = 0;
    private b4:  Logic<16> = 0; private b5:  Logic<16> = 0; private b6:  Logic<16> = 0; private b7:  Logic<16> = 0;
    private b8:  Logic<16> = 0; private b9:  Logic<16> = 0; private b10: Logic<16> = 0; private b11: Logic<16> = 0;
    private b12: Logic<16> = 0; private b13: Logic<16> = 0; private b14: Logic<16> = 0; private b15: Logic<16> = 0;

    // Result C from engine (read-only)
    private c0:  Logic<16> = 0; private c1:  Logic<16> = 0; private c2:  Logic<16> = 0; private c3:  Logic<16> = 0;
    private c4:  Logic<16> = 0; private c5:  Logic<16> = 0; private c6:  Logic<16> = 0; private c7:  Logic<16> = 0;
    private c8:  Logic<16> = 0; private c9:  Logic<16> = 0; private c10: Logic<16> = 0; private c11: Logic<16> = 0;
    private c12: Logic<16> = 0; private c13: Logic<16> = 0; private c14: Logic<16> = 0; private c15: Logic<16> = 0;

    // RX submodule interface
    private rx_data:  Logic<8> = 0;
    private rx_valid: Bit      = 0;

    // TX submodule interface
    private tx_data:  Logic<8> = 0;
    private tx_valid: Bit      = 0;
    private tx_ready: Bit      = 1;

    // State
    private topSt:    MxTopSt   = MxTopSt.MXT_WAIT_A;
    private byteCnt:  Logic<6>  = 0;  // 0..63
    private sendCnt:  Logic<6>  = 0;  // 0..31
    private txSent:   Bit       = 0;  // 1-clock guard: set when tx_valid pulsed, clear when tx_ready drops

    @Submodule rx  = new MatrixUartRx();
    @Submodule tx  = new MatrixUartTx();
    @Submodule eng = new MatrixEngine();

    @Sequential('clk')
    tick(): void {
        this.tx_valid = 0;

        switch (this.topSt) {
            case MxTopSt.MXT_WAIT_A:
                if (this.rx_valid === 1) {
                    if (this.byteCnt === 0)  { this.a0  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 1)  { this.a1  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 2)  { this.a2  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 3)  { this.a3  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 4)  { this.a4  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 5)  { this.a5  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 6)  { this.a6  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 7)  { this.a7  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 8)  { this.a8  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 9)  { this.a9  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 10) { this.a10 = this.rx_data & 0xFF; }
                    if (this.byteCnt === 11) { this.a11 = this.rx_data & 0xFF; }
                    if (this.byteCnt === 12) { this.a12 = this.rx_data & 0xFF; }
                    if (this.byteCnt === 13) { this.a13 = this.rx_data & 0xFF; }
                    if (this.byteCnt === 14) { this.a14 = this.rx_data & 0xFF; }
                    if (this.byteCnt === 15) { this.a15 = this.rx_data & 0xFF; }
                    if (this.byteCnt === MX_A_COUNT) {
                        this.byteCnt = 0;
                        this.topSt   = MxTopSt.MXT_WAIT_B;
                    } else {
                        this.byteCnt = this.byteCnt + 1;
                    }
                }
                break;

            case MxTopSt.MXT_WAIT_B:
                if (this.rx_valid === 1) {
                    if (this.byteCnt === 0)  { this.b0  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 1)  { this.b1  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 2)  { this.b2  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 3)  { this.b3  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 4)  { this.b4  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 5)  { this.b5  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 6)  { this.b6  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 7)  { this.b7  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 8)  { this.b8  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 9)  { this.b9  = this.rx_data & 0xFF; }
                    if (this.byteCnt === 10) { this.b10 = this.rx_data & 0xFF; }
                    if (this.byteCnt === 11) { this.b11 = this.rx_data & 0xFF; }
                    if (this.byteCnt === 12) { this.b12 = this.rx_data & 0xFF; }
                    if (this.byteCnt === 13) { this.b13 = this.rx_data & 0xFF; }
                    if (this.byteCnt === 14) { this.b14 = this.rx_data & 0xFF; }
                    if (this.byteCnt === 15) {
                        this.b15     = this.rx_data & 0xFF;
                        this.byteCnt = 0;
                        this.sendCnt = 0;
                        this.txSent  = 0;
                        this.topSt   = MxTopSt.MXT_SEND;
                        this.led     = 0x3E;
                    } else {
                        this.byteCnt = this.byteCnt + 1;
                    }
                }
                break;

            case MxTopSt.MXT_SEND:
                if (this.tx_ready === 1) {
                    if (this.txSent === 0) {
                        this.tx_valid = 1;
                        this.txSent   = 1;
                        // Send c0..c15 as little-endian uint16 (low byte then high byte)
                        if (this.sendCnt === 0)  { this.tx_data = this.c0  & 0xFF; }
                        if (this.sendCnt === 1)  { this.tx_data = (this.c0  >> 8) & 0xFF; }
                        if (this.sendCnt === 2)  { this.tx_data = this.c1  & 0xFF; }
                        if (this.sendCnt === 3)  { this.tx_data = (this.c1  >> 8) & 0xFF; }
                        if (this.sendCnt === 4)  { this.tx_data = this.c2  & 0xFF; }
                        if (this.sendCnt === 5)  { this.tx_data = (this.c2  >> 8) & 0xFF; }
                        if (this.sendCnt === 6)  { this.tx_data = this.c3  & 0xFF; }
                        if (this.sendCnt === 7)  { this.tx_data = (this.c3  >> 8) & 0xFF; }
                        if (this.sendCnt === 8)  { this.tx_data = this.c4  & 0xFF; }
                        if (this.sendCnt === 9)  { this.tx_data = (this.c4  >> 8) & 0xFF; }
                        if (this.sendCnt === 10) { this.tx_data = this.c5  & 0xFF; }
                        if (this.sendCnt === 11) { this.tx_data = (this.c5  >> 8) & 0xFF; }
                        if (this.sendCnt === 12) { this.tx_data = this.c6  & 0xFF; }
                        if (this.sendCnt === 13) { this.tx_data = (this.c6  >> 8) & 0xFF; }
                        if (this.sendCnt === 14) { this.tx_data = this.c7  & 0xFF; }
                        if (this.sendCnt === 15) { this.tx_data = (this.c7  >> 8) & 0xFF; }
                        if (this.sendCnt === 16) { this.tx_data = this.c8  & 0xFF; }
                        if (this.sendCnt === 17) { this.tx_data = (this.c8  >> 8) & 0xFF; }
                        if (this.sendCnt === 18) { this.tx_data = this.c9  & 0xFF; }
                        if (this.sendCnt === 19) { this.tx_data = (this.c9  >> 8) & 0xFF; }
                        if (this.sendCnt === 20) { this.tx_data = this.c10 & 0xFF; }
                        if (this.sendCnt === 21) { this.tx_data = (this.c10 >> 8) & 0xFF; }
                        if (this.sendCnt === 22) { this.tx_data = this.c11 & 0xFF; }
                        if (this.sendCnt === 23) { this.tx_data = (this.c11 >> 8) & 0xFF; }
                        if (this.sendCnt === 24) { this.tx_data = this.c12 & 0xFF; }
                        if (this.sendCnt === 25) { this.tx_data = (this.c12 >> 8) & 0xFF; }
                        if (this.sendCnt === 26) { this.tx_data = this.c13 & 0xFF; }
                        if (this.sendCnt === 27) { this.tx_data = (this.c13 >> 8) & 0xFF; }
                        if (this.sendCnt === 28) { this.tx_data = this.c14 & 0xFF; }
                        if (this.sendCnt === 29) { this.tx_data = (this.c14 >> 8) & 0xFF; }
                        if (this.sendCnt === 30) { this.tx_data = this.c15 & 0xFF; }
                        if (this.sendCnt === 31) { this.tx_data = (this.c15 >> 8) & 0xFF; }
                        if (this.sendCnt === 31) {
                            this.topSt = MxTopSt.MXT_WAIT_A;
                            this.led   = 0x3F;
                        } else {
                            this.sendCnt = this.sendCnt + 1;
                        }
                    }
                } else {
                    this.txSent = 0;
                }
                break;

            default:
                this.topSt = MxTopSt.MXT_WAIT_A;
                break;
        }
    }
}

export { MatrixTop };
