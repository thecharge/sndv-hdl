// nibble4 CPU Core: 4-bit data path, 8-bit instruction
// Compiles to IEEE 1800-2017 SystemVerilog via ts2v
import { Module, Logic, Input, Output, Sequential, Combinational } from 'ts2sv';

enum CoreState { FETCH_HI, FETCH_LO, DECODE, EXEC, MEM, HALT }

enum Opcode {
  NOP = 0, LDI = 1, LD = 2, ST = 3,
  ADD = 4, SUB = 5, AND = 6, OR = 7,
  XOR = 8, NOT = 9, SHL = 10, SHR = 11,
  JMP = 12, JZ = 13, OUT = 14, HLT = 15
}

class Nibble4Core extends Module {
  @Input clk: Logic<1>;
  @Input rst_n: Logic<1>;
  @Input enable: Logic<1>;
  @Input bus_rdata: Logic<4>;
  @Input bus_ack: Logic<1>;

  @Output bus_req: Logic<1> = 0;
  @Output bus_addr: Logic<8> = 0;
  @Output bus_wdata: Logic<4> = 0;
  @Output bus_wen: Logic<1> = 0;
  @Output halted: Logic<1> = 0;

  private state: Logic<3> = 0;
  private pc: Logic<8> = 0;
  private ir_hi: Logic<4> = 0;
  private ir_lo: Logic<4> = 0;
  private operand: Logic<8> = 0;
  private r0: Logic<4> = 0;
  private r1: Logic<4> = 0;
  private r2: Logic<4> = 0;
  private r3: Logic<4> = 0;
  private flag_z: Logic<1> = 0;
  private flag_c: Logic<1> = 0;
  private alu_tmp: Logic<5> = 0;

  @Sequential(clk)
  run() {
    if (!this.enable) {
      this.bus_req = 0;
    } else {
      switch (this.state) {
        case CoreState.FETCH_HI:
          this.bus_req = 1;
          this.bus_addr = this.pc;
          this.bus_wen = 0;
          if (this.bus_ack) {
            this.ir_hi = this.bus_rdata;
            this.pc = this.pc + 1;
            this.state = CoreState.FETCH_LO;
          }
          break;

        case CoreState.FETCH_LO:
          this.bus_req = 1;
          this.bus_addr = this.pc;
          if (this.bus_ack) {
            this.ir_lo = this.bus_rdata;
            this.pc = this.pc + 1;
            this.bus_req = 0;
            this.state = CoreState.DECODE;
          }
          break;

        case CoreState.DECODE:
          if (this.ir_hi === Opcode.LDI) {
            this.bus_req = 1;
            this.bus_addr = this.pc;
            this.bus_wen = 0;
            if (this.bus_ack) {
              this.operand = this.bus_rdata;
              this.pc = this.pc + 1;
              this.bus_req = 0;
              this.state = CoreState.EXEC;
            }
          } else if (this.ir_hi === Opcode.JMP) {
            this.bus_req = 1;
            this.bus_addr = this.pc;
            this.bus_wen = 0;
            if (this.bus_ack) {
              this.operand = this.bus_rdata;
              this.pc = this.pc + 1;
              this.bus_req = 0;
              this.state = CoreState.EXEC;
            }
          } else if (this.ir_hi === Opcode.JZ) {
            this.bus_req = 1;
            this.bus_addr = this.pc;
            this.bus_wen = 0;
            if (this.bus_ack) {
              this.operand = this.bus_rdata;
              this.pc = this.pc + 1;
              this.bus_req = 0;
              this.state = CoreState.EXEC;
            }
          } else {
            this.state = CoreState.EXEC;
          }
          break;

        case CoreState.EXEC:
          if (this.ir_hi === Opcode.NOP) {
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.LDI) {
            if (this.ir_lo === 0) { this.r0 = this.operand; }
            if (this.ir_lo === 1) { this.r1 = this.operand; }
            if (this.ir_lo === 2) { this.r2 = this.operand; }
            if (this.ir_lo === 3) { this.r3 = this.operand; }
            this.flag_z = this.operand === 0;
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.ADD) {
            this.alu_tmp = this.r0 + this.r1;
            this.r0 = this.alu_tmp;
            this.flag_c = this.alu_tmp >> 4;
            this.flag_z = this.alu_tmp === 0;
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.SUB) {
            this.alu_tmp = this.r0 - this.r1;
            this.r0 = this.alu_tmp;
            this.flag_c = this.alu_tmp >> 4;
            this.flag_z = this.alu_tmp === 0;
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.AND) {
            this.r0 = this.r0 & this.r1;
            this.flag_z = this.r0 === 0;
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.OR) {
            this.r0 = this.r0 | this.r1;
            this.flag_z = this.r0 === 0;
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.XOR) {
            this.r0 = this.r0 ^ this.r1;
            this.flag_z = this.r0 === 0;
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.NOT) {
            this.r0 = ~this.r0;
            this.flag_z = this.r0 === 0;
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.SHL) {
            this.flag_c = this.r0 >> 3;
            this.r0 = this.r0 << 1;
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.SHR) {
            this.flag_c = this.r0 & 1;
            this.r0 = this.r0 >> 1;
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.JMP) {
            this.pc = this.operand;
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.JZ) {
            if (this.flag_z) {
              this.pc = this.operand;
            }
            this.state = CoreState.FETCH_HI;
          } else if (this.ir_hi === Opcode.LD) {
            this.bus_req = 1;
            this.bus_addr = this.r0;
            this.bus_wen = 0;
            this.state = CoreState.MEM;
          } else if (this.ir_hi === Opcode.ST) {
            this.bus_req = 1;
            this.bus_addr = this.r0;
            this.bus_wdata = this.r1;
            this.bus_wen = 1;
            this.state = CoreState.MEM;
          } else if (this.ir_hi === Opcode.OUT) {
            this.bus_req = 1;
            this.bus_addr = 0xF0 + this.r1;
            this.bus_wdata = this.r0;
            this.bus_wen = 1;
            this.state = CoreState.MEM;
          } else if (this.ir_hi === Opcode.HLT) {
            this.halted = 1;
            this.state = CoreState.HALT;
          }
          break;

        case CoreState.MEM:
          if (this.bus_ack) {
            this.bus_req = 0;
            if (!this.bus_wen) {
              this.r0 = this.bus_rdata;
              this.flag_z = this.bus_rdata === 0;
            }
            this.bus_wen = 0;
            this.state = CoreState.FETCH_HI;
          }
          break;

        case CoreState.HALT:
          this.bus_req = 0;
          break;

        default:
          this.state = CoreState.FETCH_HI;
          break;
      }
    }
  }
}
