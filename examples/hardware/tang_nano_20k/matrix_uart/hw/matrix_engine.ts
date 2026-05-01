// matrix_engine.ts - 4x4 8-bit matrix multiply, 16-bit output elements.
// C[i][j] = sum_k( A[i][k] * B[k][j] )  (all 8-bit inputs, 16-bit outputs)
// Computed combinationally in one clock cycle.
// Inputs stored as Logic<16> to allow correct 16-bit product accumulation.

import { HardwareModule, Module, ModuleConfig, Input, Output, Combinational } from '@ts2v/runtime';
import type { Logic } from '@ts2v/runtime';

@Module
@ModuleConfig('resetSignal: "no_rst"')
class MatrixEngine extends HardwareModule {
    @Input  a0:  Logic<16> = 0; @Input  a1:  Logic<16> = 0; @Input  a2:  Logic<16> = 0; @Input  a3:  Logic<16> = 0;
    @Input  a4:  Logic<16> = 0; @Input  a5:  Logic<16> = 0; @Input  a6:  Logic<16> = 0; @Input  a7:  Logic<16> = 0;
    @Input  a8:  Logic<16> = 0; @Input  a9:  Logic<16> = 0; @Input  a10: Logic<16> = 0; @Input  a11: Logic<16> = 0;
    @Input  a12: Logic<16> = 0; @Input  a13: Logic<16> = 0; @Input  a14: Logic<16> = 0; @Input  a15: Logic<16> = 0;

    @Input  b0:  Logic<16> = 0; @Input  b1:  Logic<16> = 0; @Input  b2:  Logic<16> = 0; @Input  b3:  Logic<16> = 0;
    @Input  b4:  Logic<16> = 0; @Input  b5:  Logic<16> = 0; @Input  b6:  Logic<16> = 0; @Input  b7:  Logic<16> = 0;
    @Input  b8:  Logic<16> = 0; @Input  b9:  Logic<16> = 0; @Input  b10: Logic<16> = 0; @Input  b11: Logic<16> = 0;
    @Input  b12: Logic<16> = 0; @Input  b13: Logic<16> = 0; @Input  b14: Logic<16> = 0; @Input  b15: Logic<16> = 0;

    @Output c0:  Logic<16> = 0; @Output c1:  Logic<16> = 0; @Output c2:  Logic<16> = 0; @Output c3:  Logic<16> = 0;
    @Output c4:  Logic<16> = 0; @Output c5:  Logic<16> = 0; @Output c6:  Logic<16> = 0; @Output c7:  Logic<16> = 0;
    @Output c8:  Logic<16> = 0; @Output c9:  Logic<16> = 0; @Output c10: Logic<16> = 0; @Output c11: Logic<16> = 0;
    @Output c12: Logic<16> = 0; @Output c13: Logic<16> = 0; @Output c14: Logic<16> = 0; @Output c15: Logic<16> = 0;

    @Combinational
    compute(): void {
        // Row 0
        this.c0  = (this.a0  * this.b0)  + (this.a1  * this.b4)  + (this.a2  * this.b8)  + (this.a3  * this.b12);
        this.c1  = (this.a0  * this.b1)  + (this.a1  * this.b5)  + (this.a2  * this.b9)  + (this.a3  * this.b13);
        this.c2  = (this.a0  * this.b2)  + (this.a1  * this.b6)  + (this.a2  * this.b10) + (this.a3  * this.b14);
        this.c3  = (this.a0  * this.b3)  + (this.a1  * this.b7)  + (this.a2  * this.b11) + (this.a3  * this.b15);
        // Row 1
        this.c4  = (this.a4  * this.b0)  + (this.a5  * this.b4)  + (this.a6  * this.b8)  + (this.a7  * this.b12);
        this.c5  = (this.a4  * this.b1)  + (this.a5  * this.b5)  + (this.a6  * this.b9)  + (this.a7  * this.b13);
        this.c6  = (this.a4  * this.b2)  + (this.a5  * this.b6)  + (this.a6  * this.b10) + (this.a7  * this.b14);
        this.c7  = (this.a4  * this.b3)  + (this.a5  * this.b7)  + (this.a6  * this.b11) + (this.a7  * this.b15);
        // Row 2
        this.c8  = (this.a8  * this.b0)  + (this.a9  * this.b4)  + (this.a10 * this.b8)  + (this.a11 * this.b12);
        this.c9  = (this.a8  * this.b1)  + (this.a9  * this.b5)  + (this.a10 * this.b9)  + (this.a11 * this.b13);
        this.c10 = (this.a8  * this.b2)  + (this.a9  * this.b6)  + (this.a10 * this.b10) + (this.a11 * this.b14);
        this.c11 = (this.a8  * this.b3)  + (this.a9  * this.b7)  + (this.a10 * this.b11) + (this.a11 * this.b15);
        // Row 3
        this.c12 = (this.a12 * this.b0)  + (this.a13 * this.b4)  + (this.a14 * this.b8)  + (this.a15 * this.b12);
        this.c13 = (this.a12 * this.b1)  + (this.a13 * this.b5)  + (this.a14 * this.b9)  + (this.a15 * this.b13);
        this.c14 = (this.a12 * this.b2)  + (this.a13 * this.b6)  + (this.a14 * this.b10) + (this.a15 * this.b14);
        this.c15 = (this.a12 * this.b3)  + (this.a13 * this.b7)  + (this.a14 * this.b11) + (this.a15 * this.b15);
    }
}

export { MatrixEngine };
