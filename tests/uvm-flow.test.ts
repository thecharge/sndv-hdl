import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { compileClassModule } from '../packages/core/src/compiler/class-compiler/class-module-compiler';
import { generateUvmLiteTestbench } from '../packages/core/src/compiler/verification/uvm-lite-testbench-generator';
import { generateBlinkyUvmLiteTestbench } from '../packages/core/src/compiler/verification/uvm-lite-blinky-testbench-generator';
import { aluUvmSpec } from '../testbenches/uvm/alu.uvm-spec';
import { blinkyUvmSpec } from '../testbenches/uvm/blinky.uvm-spec';

describe('UVM TypeScript flow', () => {
  it('compiles ALU class source through class compiler', () => {
    const result = compileClassModule(`
      class AluModule extends Module {
        @Input operand_a: Logic<32>;
        @Input operand_b: Logic<32>;
        @Output add_result: Logic<32> = 0;
        @Output xor_result: Logic<32> = 0;

        @Combinational
        run() {
          this.add_result = this.operand_a + this.operand_b;
          this.xor_result = this.operand_a ^ this.operand_b;
        }
      }
    `);

    assert.equal(result.success, true);
    assert.match(result.systemverilog, /module\s+AluModule/);
    assert.match(result.systemverilog, /add_result = operand_a \+ operand_b/);
    assert.match(result.systemverilog, /xor_result = operand_a \^ operand_b/);
  });

  it('generates UVM-style bench from typed TypeScript spec', () => {
    const bench = generateUvmLiteTestbench(aluUvmSpec);
    assert.match(bench, /module\s+tb_alu_uvm/);
    assert.match(bench, /class\s+alu_smoke_test\s+extends\s+uvm_test/);
    assert.match(bench, /alu_add\s+dut_add/);
    assert.match(bench, /apply_case\(32'd10, 32'd3, "10_3"\);/);
    assert.match(bench, /alu uvm-lite testbench: %0d passed, %0d failed/);
  });

  it('generates blinky UVM-style bench from typed TypeScript spec', () => {
    const bench = generateBlinkyUvmLiteTestbench(blinkyUvmSpec);
    assert.match(bench, /module\s+tb_blinky_uvm/);
    assert.match(bench, /Blinker\s+dut/);
    assert.match(bench, /class\s+blinky_smoke_test\s+extends\s+uvm_test/);
    assert.match(bench, /phase0_led0_on/);
    assert.match(bench, /phase5_led5_on/);
    assert.match(bench, /blinky uvm-lite testbench: %0d passed, %0d failed/);
  });
});
