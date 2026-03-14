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

    it('auto-injects rst_n and emits reset branch when rst_n is not explicitly declared', () => {
      const result = compileClassModule(`
        class X extends Module {
          @Input clk: Logic<1>;
          @Output q: Logic<8> = 12;
          @Sequential(clk)
          tick() { this.q = this.q + 1; }
        }
      `);
      assert.ok(result.success, result.errors.join(', '));
      assert.ok(result.systemverilog.includes('always_ff @(posedge clk or negedge rst_n)'));
      assert.ok(result.systemverilog.includes('if (!rst_n)'));
      assert.ok(result.systemverilog.includes("q <= 8'd12"));
      assert.ok(result.systemverilog.includes('q <= q + 1'));
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
      assert.ok(result.systemverilog.includes('input  logic [7:0] a'));
      assert.ok(result.systemverilog.includes('input  logic [7:0] b'));
      assert.ok(result.systemverilog.includes('output      logic [8:0] sum'));
    });

    it('auto-injects clk and rst_n for sequential modules without explicit declarations', () => {
      const result = compileClassModule(`
        class X extends Module {
          @Output q: Logic<1> = 0;
          @Sequential(clk)
          run() { this.q = 1; }
        }
      `);
      assert.ok(result.success);
      assert.ok(result.systemverilog.includes('input  logic clk'));
      assert.ok(result.systemverilog.includes('input  logic rst_n'));
      assert.ok(result.systemverilog.includes('always_ff @(posedge clk or negedge rst_n)'));
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
      assert.ok(result.systemverilog.includes('input  logic [127:0] lhs'));
      assert.ok(result.systemverilog.includes('input  logic [255:0] rhs'));
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

  describe('helper method inlining', () => {
    it('inlines a no-arg private helper called from @Sequential', () => {
      const result = compileClassModule(`
        class Counter extends Module {
          @Input clk: Logic<1>;
          @Output out: Logic<4> = 0;
          private cnt: Logic<4> = 0;
          @Sequential(clk)
          tick() {
            this.increment();
          }
          private increment() {
            this.cnt = this.cnt + 1;
            this.out = this.cnt;
          }
        }
      `);
      assert.ok(result.success, result.systemverilog);
      // Inlined: no unresolved call comment
      assert.ok(!result.systemverilog.includes('unresolved call'));
      // Body of increment() should appear directly in always_ff
      assert.ok(result.systemverilog.includes('cnt <= cnt + 1'));
      assert.ok(result.systemverilog.includes('out <= cnt'));
    });

    it('eliminates early return by converting to else clause', () => {
      const result = compileClassModule(`
        class Guard extends Module {
          @Input clk: Logic<1>;
          @Input en: Logic<1> = 0;
          @Output out: Logic<4> = 0;
          private cnt: Logic<4> = 0;
          @Sequential(clk)
          tick() {
            if (this.en === 0) {
              this.cnt = 0;
              return;
            }
            this.cnt = this.cnt + 1;
            this.out = this.cnt;
          }
        }
      `);
      assert.ok(result.success, result.systemverilog);
      // Guard pattern: the reset and the increment should be in if/else, not sequential
      assert.ok(result.systemverilog.includes('if (en == 0) begin'));
      assert.ok(result.systemverilog.includes('end else begin'));
      assert.ok(result.systemverilog.includes('cnt <= cnt + 1'));
    });

    it('inlines helper then eliminates return in the inlined body', () => {
      const result = compileClassModule(`
        class Ws2812Like extends Module {
          @Input clk: Logic<1>;
          @Input enable: Logic<1> = 0;
          @Output out: Logic<1> = 0;
          private phase: Logic<1> = 0;
          @Sequential(clk)
          tick() {
            if (this.enable === 0) {
              this.clearAll();
              return;
            }
            this.runPhase();
          }
          private clearAll() {
            this.out   = 0;
            this.phase = 0;
          }
          private runPhase() {
            this.out   = 1;
            this.phase = 1;
          }
        }
      `);
      assert.ok(result.success, result.systemverilog);
      // clearAll and runPhase should be inlined, not as separate blocks
      assert.ok(!result.systemverilog.includes('unresolved call'));
      // Guard structure: enable==0 branch and else branch
      assert.ok(result.systemverilog.includes('if (enable == 0) begin'));
      assert.ok(result.systemverilog.includes('end else begin'));
    });

    it('emits switch/case for palette-style dispatch', () => {
      const result = compileClassModule(`
        const RED   = 0xFF0000;
        const GREEN = 0x00FF00;
        class Palette extends Module {
          @Input clk: Logic<1>;
          @Input sel: Logic<2> = 0;
          @Output colour: Logic<24> = 0;
          @Sequential(clk)
          tick() {
            switch (this.sel) {
              case 0: this.colour = RED;   break;
              case 1: this.colour = GREEN; break;
              default: this.colour = 0;   break;
            }
          }
        }
      `);
      assert.ok(result.success, result.systemverilog);
      assert.ok(result.systemverilog.includes('case (sel)'));
      assert.ok(result.systemverilog.includes('endcase'));
    });
  });
});
