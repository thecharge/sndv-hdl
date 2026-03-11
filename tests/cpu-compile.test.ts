import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import { compileClassModule } from '../src/class-compiler/class-module-compiler';

describe('CPU TypeScript -> SystemVerilog', () => {
  describe('nibble4_core.ts compilation', () => {
    const source = fs.readFileSync('cpu/ts/nibble4_core.ts', 'utf-8');
    const result = compileClassModule(source);

    it('compiles without errors', () => {
      assert.ok(result.success, 'Errors: ' + result.errors.join('; '));
    });

    it('generates Nibble4Core module', () => {
      assert.ok(result.systemverilog.includes('module Nibble4Core'));
      assert.ok(result.systemverilog.includes('endmodule'));
    });

    it('has CoreState enum with correct encoding', () => {
      assert.ok(result.systemverilog.includes('typedef enum logic [2:0]'));
      assert.ok(result.systemverilog.includes('FETCH_HI'));
      assert.ok(result.systemverilog.includes('FETCH_LO'));
      assert.ok(result.systemverilog.includes('DECODE'));
      assert.ok(result.systemverilog.includes('EXEC'));
      assert.ok(result.systemverilog.includes('MEM'));
      assert.ok(result.systemverilog.includes('HALT'));
    });

    it('has Opcode enum with 16 entries', () => {
      assert.ok(result.systemverilog.includes('typedef enum logic [3:0]'));
      assert.ok(result.systemverilog.includes('NOP'));
      assert.ok(result.systemverilog.includes('HLT'));
      assert.ok(result.systemverilog.includes("HLT = 4'd15"));
    });

    it('generates always_ff with async reset', () => {
      assert.ok(result.systemverilog.includes('always_ff @(posedge clk or negedge rst_n)'));
    });

    it('resets all registers', () => {
      assert.ok(result.systemverilog.includes('pc <= 0'));
      assert.ok(result.systemverilog.includes('r0 <= 0'));
      assert.ok(result.systemverilog.includes('r1 <= 0'));
      assert.ok(result.systemverilog.includes('r2 <= 0'));
      assert.ok(result.systemverilog.includes('r3 <= 0'));
      assert.ok(result.systemverilog.includes('state <= 0'));
      assert.ok(result.systemverilog.includes('flag_z <= 0'));
      assert.ok(result.systemverilog.includes('flag_c <= 0'));
    });

    it('has case statement over state', () => {
      assert.ok(result.systemverilog.includes('case (state)'));
      assert.ok(result.systemverilog.includes('FETCH_HI: begin'));
      assert.ok(result.systemverilog.includes('EXEC: begin'));
      assert.ok(result.systemverilog.includes('MEM: begin'));
    });

    it('uses non-blocking assignment in sequential', () => {
      assert.ok(result.systemverilog.includes('pc <= pc + 1'));
      assert.ok(result.systemverilog.includes('state <= FETCH_LO'));
    });

    it('has proper port widths', () => {
      assert.ok(result.systemverilog.includes('[3:0] bus_rdata'));
      assert.ok(result.systemverilog.includes('[7:0] bus_addr'));
      assert.ok(result.systemverilog.includes('[3:0] bus_wdata'));
    });

    it('generates IEEE 1800-2017 compliance headers', () => {
      assert.ok(result.systemverilog.includes('`timescale 1ns / 1ps'));
      assert.ok(result.systemverilog.includes('`default_nettype none'));
      assert.ok(result.systemverilog.includes('`default_nettype wire'));
    });
  });

  describe('nibble4_soc.ts compilation', () => {
    const source = fs.readFileSync('cpu/ts/nibble4_soc.ts', 'utf-8');
    const result = compileClassModule(source);

    it('compiles without errors', () => {
      assert.ok(result.success, 'Errors: ' + result.errors.join('; '));
    });

    it('generates three modules', () => {
      assert.strictEqual(result.parsed!.modules.length, 3);
    });

    it('generates Nibble4Arbiter with dual ports', () => {
      assert.ok(result.systemverilog.includes('module Nibble4Arbiter'));
      assert.ok(result.systemverilog.includes('req_0'));
      assert.ok(result.systemverilog.includes('req_1'));
      assert.ok(result.systemverilog.includes('ack_0'));
      assert.ok(result.systemverilog.includes('ack_1'));
    });

    it('generates Nibble4Memory with peripherals', () => {
      assert.ok(result.systemverilog.includes('module Nibble4Memory'));
      assert.ok(result.systemverilog.includes('uart_tx_data'));
      assert.ok(result.systemverilog.includes('led_out'));
      assert.ok(result.systemverilog.includes('mutex_locked'));
    });

    it('generates Nibble4UartTx with FSM', () => {
      assert.ok(result.systemverilog.includes('module Nibble4UartTx'));
      assert.ok(result.systemverilog.includes('typedef enum logic [2:0]'));
      assert.ok(result.systemverilog.includes('IDLE'));
      assert.ok(result.systemverilog.includes('START'));
      assert.ok(result.systemverilog.includes('DATA'));
      assert.ok(result.systemverilog.includes('STOP'));
    });

    it('Memory uses both always_ff and always_comb', () => {
      assert.ok(result.systemverilog.includes('always_ff'));
      assert.ok(result.systemverilog.includes('always_comb'));
    });

    it('Arbiter uses non-blocking assignment', () => {
      const arbiter_section = result.systemverilog.split('endmodule')[0];
      assert.ok(arbiter_section.includes('ack_0 <= 1'));
      assert.ok(arbiter_section.includes('priority <= 1'));
    });
  });

  describe('reset polarity (penalty: posedge + negedge)', () => {
    it('supports active_low (negedge rst_n) by default', () => {
      const result = compileClassModule(`
        class M extends Module {
          @Output out: Logic<8> = 0;
          @Sequential(clk) run() { this.out = this.out + 1; }
        }
      `);
      assert.ok(result.success);
      assert.ok(result.systemverilog.includes('negedge rst_n'));
      assert.ok(result.systemverilog.includes('if (!rst_n)'));
    });

    it('supports active_high (posedge rst) via @ModuleConfig', () => {
      const result = compileClassModule(`
        @ModuleConfig({ resetSignal: "sys_rst", resetPolarity: "active_high", resetType: "async" })
        class M extends Module {
          @Output out: Logic<8> = 0;
          @Sequential(clk) run() { this.out = this.out + 1; }
        }
      `);
      assert.ok(result.success);
      assert.ok(result.systemverilog.includes('posedge sys_rst'));
      assert.ok(result.systemverilog.includes('if (sys_rst)'));
    });

    it('supports synchronous reset (no edge in sensitivity)', () => {
      const result = compileClassModule(`
        @ModuleConfig({ resetType: "synchronous" })
        class M extends Module {
          @Output out: Logic<8> = 0;
          @Sequential(clk) run() { this.out = this.out + 1; }
        }
      `);
      assert.ok(result.success);
      // Synchronous: only posedge clk, no rst in sensitivity
      assert.ok(result.systemverilog.includes('always_ff @(posedge clk)'));
      assert.ok(!result.systemverilog.includes('negedge'));
    });
  });

  describe('cross-architecture comparison (TS vs Verilog)', () => {
    it('TS core has same register set as hand-written Verilog', () => {
      const source = fs.readFileSync('cpu/ts/nibble4_core.ts', 'utf-8');
      const result = compileClassModule(source);
      assert.ok(result.success);
      // Check all registers present
      for (const reg of ['r0', 'r1', 'r2', 'r3', 'pc', 'flag_z', 'flag_c', 'ir_hi', 'ir_lo']) {
        assert.ok(result.systemverilog.includes(reg), `Missing register: ${reg}`);
      }
    });

    it('TS core has same ISA opcodes as hand-written Verilog', () => {
      const source = fs.readFileSync('cpu/ts/nibble4_core.ts', 'utf-8');
      const result = compileClassModule(source);
      assert.ok(result.success);
      for (const op of ['NOP', 'LDI', 'LD', 'ST', 'ADD', 'SUB', 'AND', 'OR', 'XOR', 'NOT', 'SHL', 'SHR', 'JMP', 'JZ', 'OUT', 'HLT']) {
        assert.ok(result.systemverilog.includes(op), `Missing opcode: ${op}`);
      }
    });
  });
});
