import { UvmLiteTestbenchSpec } from '../../../packages/core/src/compiler/verification/uvm-lite-testbench-generator';

export const aluUvmSpec: UvmLiteTestbenchSpec = {
  testbenchModuleName: 'tb_alu_uvm',
  interfaceName: 'alu_if',
  operandAName: 'operand_a',
  operandBName: 'operand_b',
  operations: [
    {
      name: 'add',
      moduleName: 'alu_add',
      outputSignal: 'add_result',
      expectedExpression: 'operand_a + operand_b',
    },
    {
      name: 'sub',
      moduleName: 'alu_sub',
      outputSignal: 'sub_result',
      expectedExpression: 'operand_a - operand_b',
    },
    {
      name: 'and',
      moduleName: 'alu_and',
      outputSignal: 'and_result',
      expectedExpression: 'operand_a & operand_b',
    },
    {
      name: 'or',
      moduleName: 'alu_or',
      outputSignal: 'or_result',
      expectedExpression: 'operand_a | operand_b',
    },
    {
      name: 'xor',
      moduleName: 'alu_xor',
      outputSignal: 'xor_result',
      expectedExpression: 'operand_a ^ operand_b',
    },
  ],
  vectors: [
    { label: '10_3', operandA: "32'd10", operandB: "32'd3" },
    { label: 'zero_zero', operandA: "32'd0", operandB: "32'd0" },
    { label: 'pattern_mix', operandA: "32'hFF00FF00", operandB: "32'h0F0F0F0F" },
    { label: 'wraparound_add', operandA: "32'hFFFFFFFF", operandB: "32'h00000001" },
    { label: 'cross_pattern', operandA: "32'h12345678", operandB: "32'h87654321" },
  ],
};
