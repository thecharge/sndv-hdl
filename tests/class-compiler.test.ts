import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { compileClassModule, ClassModuleParser, ClassModuleEmitter } from '../packages/core/src/compiler/class-compiler/class-module-compiler';
import { generateConstraints, BoardDefinition } from '../packages/core/src/compiler/constraints/board-constraint-gen';

describe('ClassModuleCompiler', () => {

  describe('enum generation', () => {
    it('generates typedef enum with correct bit widths', () => {
      const result = compileClassModule(`
        enum State { IDLE, RUN, DONE }
        class X extends Module {
          @Input clk: Logic<1>;
          @Output out: Logic<1> = 0;
          @Combinational
          logic() { this.out = 0; }
        }
      `);
      assert.ok(result.success, result.errors.join(', '));
      assert.ok(result.systemverilog.includes('typedef enum logic [1:0]'));
      assert.ok(result.systemverilog.includes("IDLE = 2'd0"));
      assert.ok(result.systemverilog.includes("RUN = 2'd1"));
      assert.ok(result.systemverilog.includes("DONE = 2'd2"));
      assert.ok(result.systemverilog.includes('} State;'));
    });

    it('handles 4-member enum needing 2 bits', () => {
      const result = compileClassModule(`
        enum Op { ADD, SUB, AND, OR }
        class X extends Module {
          @Input a: Logic<1>;
          @Output b: Logic<1> = 0;
          @Combinational
          logic() { this.b = this.a; }
        }
      `);
      assert.ok(result.success);
      assert.ok(result.systemverilog.includes('logic [1:0]'));
    });

    it('handles 16-member enum needing 4 bits', () => {
      const result = compileClassModule(`
        enum Opcode { NOP=0, LDI=1, LD=2, ST=3, ADD=4, SUB=5, AND=6, OR=7, XOR=8, NOT=9, SHL=10, SHR=11, JMP=12, JZ=13, OUT=14, HLT=15 }
        class X extends Module {
          @Input a: Logic<1>;
          @Output b: Logic<1> = 0;
          @Combinational
          logic() { this.b = this.a; }
        }
      `);
      assert.ok(result.success);
      assert.ok(result.systemverilog.includes('logic [3:0]'));
      assert.ok(result.systemverilog.includes("HLT = 4'd15"));
    });
  });

  describe('sequential logic', () => {
    it('generates always_ff with posedge clk and negedge rst_n', () => {
      const result = compileClassModule(`
        class Counter extends Module {
          @Input clk: Logic<1>;
          @Input rst_n: Logic<1>;
          @Output count: Logic<8> = 0;
          @Sequential(clk)
          update() {
            this.count = this.count + 1;
          }
        }
      `);
      assert.ok(result.success, result.errors.join(', '));
      assert.ok(result.systemverilog.includes('always_ff @(posedge clk or negedge rst_n)'));
      assert.ok(result.systemverilog.includes('if (!rst_n)'));
      assert.ok(result.systemverilog.includes("count <= 8'd0"));
      assert.ok(result.systemverilog.includes('count <= count + 1'));
    });

    it('uses non-blocking assignments in sequential', () => {
      const result = compileClassModule(`
        class X extends Module {
          @Input clk: Logic<1>;
          @Output a: Logic<4> = 0;
          @Sequential(clk)
          run() { this.a = 5; }
        }
      `);
      assert.ok(result.success);
      assert.ok(result.systemverilog.includes("a <= 4'd5"));
      assert.ok(!result.systemverilog.includes("a = 4'd5;"));
    });
  });

  describe('combinational logic', () => {
    it('generates always_comb with blocking assignments', () => {
      const result = compileClassModule(`
        class Mux extends Module {
          @Input sel: Logic<1>;
          @Input a: Logic<8>;
          @Input b: Logic<8>;
          @Output y: Logic<8> = 0;
          @Combinational
          select() {
            if (this.sel) {
              this.y = this.a;
            } else {
              this.y = this.b;
            }
          }
        }
      `);
      assert.ok(result.success, result.errors.join(', '));
      assert.ok(result.systemverilog.includes('always_comb'));
      assert.ok(result.systemverilog.includes('y = a'));
      assert.ok(result.systemverilog.includes('y = b'));
    });

    it('parses single-statement if/else without braces', () => {
      const result = compileClassModule(`
        class NoBraceIf extends Module {
          @Input sel: Logic<1>;
          @Input a: Logic<8>;
          @Input b: Logic<8>;
          @Output y: Logic<8> = 0;
          @Combinational
          route() {
            if (this.sel) this.y = this.a;
            else this.y = this.b;
          }
        }
      `);
      assert.ok(result.success, result.errors.join(', '));
      assert.ok(result.systemverilog.includes('always_comb'));
      assert.ok(result.systemverilog.includes('if (sel)'));
      assert.ok(result.systemverilog.includes('y = a'));
      assert.ok(result.systemverilog.includes('y = b'));
    });
  });

  describe('switch/case', () => {
    it('generates case statement from switch', () => {
      const result = compileClassModule(`
        enum State { IDLE, RUN, DONE }
        class FSM extends Module {
          @Input clk: Logic<1>;
          @Output out: Logic<4> = 0;
          private state: Logic<2> = 0;
          @Sequential(clk)
          logic() {
            switch (this.state) {
              case State.IDLE:
                this.state = State.RUN;
                break;
              case State.RUN:
                this.out = 0xA;
                this.state = State.DONE;
                break;
              default:
                this.state = State.IDLE;
                break;
            }
          }
        }
      `);
      assert.ok(result.success, result.errors.join(', '));
      assert.ok(result.systemverilog.includes('case (state)'));
      assert.ok(result.systemverilog.includes('IDLE: begin'));
      assert.ok(result.systemverilog.includes('RUN: begin'));
      assert.ok(result.systemverilog.includes('default: begin'));
      assert.ok(result.systemverilog.includes('endcase'));
    });
  });

  describe('port generation', () => {
    it('generates input/output ports correctly', () => {
      const result = compileClassModule(`
        class Adder extends Module {
          @Input a: Logic<8>;
          @Input b: Logic<8>;
          @Output sum: Logic<9> = 0;
          @Combinational
          add() { this.sum = this.a + this.b; }
        }
      `);
      assert.ok(result.success);
      assert.ok(result.systemverilog.includes('input  wire logic [7:0] a'));
      assert.ok(result.systemverilog.includes('input  wire logic [7:0] b'));
      assert.ok(result.systemverilog.includes('output      logic [8:0] sum'));
    });

    it('auto-injects clk but does not force implicit reset input', () => {
      const result = compileClassModule(`
        class X extends Module {
          @Output q: Logic<1> = 0;
          @Sequential(clk)
          run() { this.q = 1; }
        }
      `);
      assert.ok(result.success);
      assert.ok(result.systemverilog.includes('input  wire logic clk'));
      assert.ok(!result.systemverilog.includes('input  wire logic rst_n'));
      assert.ok(result.systemverilog.includes('always_ff @(posedge clk)'));
    });

    it('supports UintN and UIntN widths above 64 bits', () => {
      const result = compileClassModule(`
        class WideBus extends Module {
          @Input lhs: Uint128;
          @Input rhs: UInt256;
          @Output out: Logic<256> = 0;
          @Combinational
          sum() { this.out = this.rhs + this.lhs; }
        }
      `);
      assert.ok(result.success, result.errors.join(', '));
      assert.ok(result.systemverilog.includes('input  wire logic [127:0] lhs'));
      assert.ok(result.systemverilog.includes('input  wire logic [255:0] rhs'));
      assert.ok(result.systemverilog.includes('output      logic [255:0] out'));
    });
  });

  describe('IEEE 1800-2017 compliance', () => {
    it('emits timescale directive', () => {
      const result = compileClassModule(`
        class X extends Module {
          @Input a: Logic<1>;
          @Output b: Logic<1> = 0;
          @Combinational
          run() { this.b = this.a; }
        }
      `);
      assert.ok(result.success);
      assert.ok(result.systemverilog.includes('`timescale 1ns / 1ps'));
    });

    it('emits default_nettype none and wire', () => {
      const result = compileClassModule(`
        class X extends Module {
          @Input a: Logic<1>;
          @Output b: Logic<1> = 0;
          @Combinational
          run() { this.b = this.a; }
        }
      `);
      assert.ok(result.success);
      assert.ok(result.systemverilog.includes('`default_nettype none'));
      assert.ok(result.systemverilog.includes('`default_nettype wire'));
    });
  });

  describe('this.property translation', () => {
    it('strips this. prefix from property names', () => {
      const result = compileClassModule(`
        class X extends Module {
          @Input clk: Logic<1>;
          @Output out: Logic<4> = 0;
          private cnt: Logic<4> = 0;
          @Sequential(clk)
          run() {
            this.cnt = this.cnt + 1;
            this.out = this.cnt;
          }
        }
      `);
      assert.ok(result.success);
      assert.ok(!result.systemverilog.includes('this.'));
      assert.ok(result.systemverilog.includes('cnt <= cnt + 1'));
      assert.ok(result.systemverilog.includes('out <= cnt'));
    });
  });

  describe('CPU compilation', () => {
    it('compiles nibble4_core.ts successfully', () => {
      const fs = require('fs');
      const source = fs.readFileSync('cpu/ts/nibble4_core.ts', 'utf-8');
      const result = compileClassModule(source);
      assert.ok(result.success, 'Core compilation failed: ' + result.errors.join(', '));
      assert.ok(result.systemverilog.includes('module Nibble4Core'));
      assert.ok(result.systemverilog.includes('always_ff @(posedge clk or negedge rst_n)'));
      assert.ok(result.systemverilog.includes('typedef enum'));
      assert.ok(result.systemverilog.includes('case (state)'));
      assert.ok(result.systemverilog.includes('FETCH_HI'));
      // Must have all registers
      assert.ok(result.systemverilog.includes('logic [3:0] r0'));
      assert.ok(result.systemverilog.includes('logic [7:0] pc'));
    });

    it('compiles nibble4_soc.ts with arbiter, memory, UART', () => {
      const fs = require('fs');
      const source = fs.readFileSync('cpu/ts/nibble4_soc.ts', 'utf-8');
      const result = compileClassModule(source);
      assert.ok(result.success, 'SoC compilation failed: ' + result.errors.join(', '));
      assert.ok(result.systemverilog.includes('module Nibble4Arbiter'));
      assert.ok(result.systemverilog.includes('module Nibble4Memory'));
      assert.ok(result.systemverilog.includes('module Nibble4UartTx'));
      // Check arbiter has both core ports
      assert.ok(result.systemverilog.includes('req_0'));
      assert.ok(result.systemverilog.includes('req_1'));
      assert.ok(result.systemverilog.includes('ack_0'));
      assert.ok(result.systemverilog.includes('ack_1'));
      // Check UART has FSM
      assert.ok(result.systemverilog.includes('UartState'));
    });
  });
});

describe('BoardConstraintGenerator', () => {

  it('generates Gowin .cst from board.json', () => {
    const board: BoardDefinition = {
      vendor: 'gowin', family: 'GW1NR-9C', part: 'GW1NR-LV9QN88PC6/I5',
      clocks: { clk: { pin: '52', freq: '27MHz', std: 'LVCMOS33' } },
      io: { 'led[0]': { pin: '10', std: 'LVCMOS33' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.cst'));
    assert.ok(result.content.includes('IO_LOC  "clk" 52'));
    assert.ok(result.content.includes('IO_TYPE=LVCMOS33'));
    assert.ok(result.content.includes('IO_LOC  "led[0]" 10'));
  });

  it('generates Xilinx .xdc with create_clock', () => {
    const board: BoardDefinition = {
      vendor: 'xilinx', family: 'artix7', part: 'xc7a35t',
      clocks: { sys_clk: { pin: 'E3', freq: '100MHz', std: 'LVCMOS33' } },
      io: { uart_tx: { pin: 'D10', std: 'LVCMOS33' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.xdc'));
    assert.ok(result.content.includes('set_property PACKAGE_PIN E3'));
    assert.ok(result.content.includes('create_clock -period 10.000'));
    assert.ok(result.content.includes('set_property PACKAGE_PIN D10'));
  });

  it('generates Intel .qsf', () => {
    const board: BoardDefinition = {
      vendor: 'intel', family: 'cyclone10', part: '10CL025YU256C8G',
      clocks: { clk: { pin: 'M2', freq: '50MHz', std: '3.3-V LVCMOS' } },
      io: { led: { pin: 'U7', std: '3.3-V LVCMOS' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.qsf'));
    assert.ok(result.content.includes('set_location_assignment PIN_M2'));
    assert.ok(result.content.includes('set_global_assignment -name DEVICE'));
  });

  it('generates Lattice .lpf', () => {
    const board: BoardDefinition = {
      vendor: 'lattice', family: 'ecp5', part: 'LFE5U-85F',
      clocks: { clk: { pin: 'P3', freq: '25MHz', std: 'LVCMOS33' } },
      io: { led: { pin: 'B2', std: 'LVCMOS33' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.lpf'));
    assert.ok(result.content.includes('LOCATE COMP "clk" SITE "P3"'));
    assert.ok(result.content.includes('FREQUENCY PORT "clk" 25 MHz'));
  });
});
