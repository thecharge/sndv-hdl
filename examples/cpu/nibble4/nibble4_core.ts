// nibble4_core.ts - 4-bit CPU core: 4-bit data path, 8-bit instruction word.
// Compile as part of examples/cpu/nibble4 directory.
import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

enum CoreState {
    CS_FETCH_HI = 0, CS_FETCH_LO = 1, CS_DECODE = 2,
    CS_EXEC = 3, CS_MEM = 4, CS_HALT = 5
}

enum Opcode {
    N4_NOP = 0, N4_LDI = 1, N4_LD = 2, N4_ST = 3,
    N4_ADD = 4, N4_SUB = 5, N4_AND = 6, N4_OR = 7,
    N4_XOR = 8, N4_NOT = 9, N4_SHL = 10, N4_SHR = 11,
    N4_JMP = 12, N4_JZ = 13, N4_OUT = 14, N4_HLT = 15
}

@Module
@ModuleConfig('resetSignal: "rst_n"')
class Nibble4Core extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  rst_n: Bit = 1;
    @Input  enable: Bit = 0;
    @Input  bus_rdata: Logic<4> = 0;
    @Input  bus_ack: Bit = 0;

    @Output bus_req: Bit = 0;
    @Output bus_addr: Logic<8> = 0;
    @Output bus_wdata: Logic<4> = 0;
    @Output bus_wen: Bit = 0;
    @Output halted: Bit = 0;

    private state: Logic<3> = CoreState.CS_FETCH_HI;
    private pc: Logic<8> = 0;
    private ir_hi: Logic<4> = 0;
    private ir_lo: Logic<4> = 0;
    private operand: Logic<8> = 0;
    private r0: Logic<4> = 0;
    private r1: Logic<4> = 0;
    private r2: Logic<4> = 0;
    private r3: Logic<4> = 0;
    private flag_z: Bit = 0;
    private flag_c: Bit = 0;
    private alu_tmp: Logic<5> = 0;

    @Sequential('clk')
    run(): void {
        if (this.enable === 0) {
            this.bus_req = 0;
        } else {
            switch (this.state) {
                case CoreState.CS_FETCH_HI:
                    this.bus_req = 1;
                    this.bus_addr = this.pc;
                    this.bus_wen = 0;
                    if (this.bus_ack === 1) {
                        this.ir_hi = this.bus_rdata;
                        this.pc = this.pc + 1;
                        this.state = CoreState.CS_FETCH_LO;
                    }
                    break;

                case CoreState.CS_FETCH_LO:
                    this.bus_req = 1;
                    this.bus_addr = this.pc;
                    if (this.bus_ack === 1) {
                        this.ir_lo = this.bus_rdata;
                        this.pc = this.pc + 1;
                        this.bus_req = 0;
                        this.state = CoreState.CS_DECODE;
                    }
                    break;

                case CoreState.CS_DECODE:
                    if (this.ir_hi === Opcode.N4_LDI) {
                        this.bus_req = 1;
                        this.bus_addr = this.pc;
                        this.bus_wen = 0;
                        if (this.bus_ack === 1) {
                            this.operand = this.bus_rdata;
                            this.pc = this.pc + 1;
                            this.bus_req = 0;
                            this.state = CoreState.CS_EXEC;
                        }
                    } else if (this.ir_hi === Opcode.N4_JMP) {
                        this.bus_req = 1;
                        this.bus_addr = this.pc;
                        this.bus_wen = 0;
                        if (this.bus_ack === 1) {
                            this.operand = this.bus_rdata;
                            this.pc = this.pc + 1;
                            this.bus_req = 0;
                            this.state = CoreState.CS_EXEC;
                        }
                    } else if (this.ir_hi === Opcode.N4_JZ) {
                        this.bus_req = 1;
                        this.bus_addr = this.pc;
                        this.bus_wen = 0;
                        if (this.bus_ack === 1) {
                            this.operand = this.bus_rdata;
                            this.pc = this.pc + 1;
                            this.bus_req = 0;
                            this.state = CoreState.CS_EXEC;
                        }
                    } else {
                        this.state = CoreState.CS_EXEC;
                    }
                    break;

                case CoreState.CS_EXEC:
                    if (this.ir_hi === Opcode.N4_NOP) {
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_LDI) {
                        if (this.ir_lo === 0) { this.r0 = this.operand; }
                        if (this.ir_lo === 1) { this.r1 = this.operand; }
                        if (this.ir_lo === 2) { this.r2 = this.operand; }
                        if (this.ir_lo === 3) { this.r3 = this.operand; }
                        this.flag_z = 0;
                        if (this.operand === 0) { this.flag_z = 1; }
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_ADD) {
                        this.alu_tmp = this.r0 + this.r1;
                        this.r0 = this.alu_tmp & 0xF;
                        this.flag_c = (this.alu_tmp >> 4) & 1;
                        this.flag_z = 0;
                        if ((this.alu_tmp & 0xF) === 0) { this.flag_z = 1; }
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_SUB) {
                        this.alu_tmp = this.r0 - this.r1;
                        this.r0 = this.alu_tmp & 0xF;
                        this.flag_c = (this.alu_tmp >> 4) & 1;
                        this.flag_z = 0;
                        if ((this.alu_tmp & 0xF) === 0) { this.flag_z = 1; }
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_AND) {
                        this.r0 = this.r0 & this.r1;
                        this.flag_z = 0;
                        if (this.r0 === 0) { this.flag_z = 1; }
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_OR) {
                        this.r0 = this.r0 | this.r1;
                        this.flag_z = 0;
                        if (this.r0 === 0) { this.flag_z = 1; }
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_XOR) {
                        this.r0 = this.r0 ^ this.r1;
                        this.flag_z = 0;
                        if (this.r0 === 0) { this.flag_z = 1; }
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_NOT) {
                        this.r0 = ~this.r0 & 0xF;
                        this.flag_z = 0;
                        if (this.r0 === 0) { this.flag_z = 1; }
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_SHL) {
                        this.flag_c = (this.r0 >> 3) & 1;
                        this.r0 = (this.r0 << 1) & 0xF;
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_SHR) {
                        this.flag_c = this.r0 & 1;
                        this.r0 = this.r0 >> 1;
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_JMP) {
                        this.pc = this.operand;
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_JZ) {
                        if (this.flag_z === 1) {
                            this.pc = this.operand;
                        }
                        this.state = CoreState.CS_FETCH_HI;
                    } else if (this.ir_hi === Opcode.N4_LD) {
                        this.bus_req = 1;
                        this.bus_addr = this.r0;
                        this.bus_wen = 0;
                        this.state = CoreState.CS_MEM;
                    } else if (this.ir_hi === Opcode.N4_ST) {
                        this.bus_req = 1;
                        this.bus_addr = this.r0;
                        this.bus_wdata = this.r1;
                        this.bus_wen = 1;
                        this.state = CoreState.CS_MEM;
                    } else if (this.ir_hi === Opcode.N4_OUT) {
                        this.bus_req = 1;
                        this.bus_addr = 0xF0 + this.r1;
                        this.bus_wdata = this.r0;
                        this.bus_wen = 1;
                        this.state = CoreState.CS_MEM;
                    } else if (this.ir_hi === Opcode.N4_HLT) {
                        this.halted = 1;
                        this.state = CoreState.CS_HALT;
                    }
                    break;

                case CoreState.CS_MEM:
                    if (this.bus_ack === 1) {
                        this.bus_req = 0;
                        if (this.bus_wen === 0) {
                            this.r0 = this.bus_rdata;
                            this.flag_z = 0;
                            if (this.bus_rdata === 0) { this.flag_z = 1; }
                        }
                        this.bus_wen = 0;
                        this.state = CoreState.CS_FETCH_HI;
                    }
                    break;

                case CoreState.CS_HALT:
                    this.bus_req = 0;
                    break;

                default:
                    this.state = CoreState.CS_FETCH_HI;
                    break;
            }
        }
    }
}

export { Nibble4Core };
