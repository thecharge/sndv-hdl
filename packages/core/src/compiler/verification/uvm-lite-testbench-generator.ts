export interface UvmLiteOperationSpec {
  name: string;
  moduleName: string;
  outputSignal: string;
  expectedExpression: string;
}

export interface UvmLiteVectorSpec {
  label: string;
  operandA: string;
  operandB: string;
}

export interface UvmLiteTestbenchSpec {
  testbenchModuleName: string;
  interfaceName: string;
  operandAName: string;
  operandBName: string;
  operations: UvmLiteOperationSpec[];
  vectors: UvmLiteVectorSpec[];
}

function toItemExpression(expression: string, spec: UvmLiteTestbenchSpec): string {
  return expression
    .replace(new RegExp(`\\b${spec.operandAName}\\b`, 'g'), `item.${spec.operandAName}`)
    .replace(new RegExp(`\\b${spec.operandBName}\\b`, 'g'), `item.${spec.operandBName}`);
}

function emitOperationInstantiation(op: UvmLiteOperationSpec, ifName: string, operandAName: string, operandBName: string): string {
  return [
    `  ${op.moduleName} dut_${op.name} (`,
    `    .${operandAName}(${ifName}.${operandAName}),`,
    `    .${operandBName}(${ifName}.${operandBName}),`,
    `    .result(${ifName}.${op.outputSignal})`,
    '  );',
    '',
  ].join('\n');
}

function emitInterface(spec: UvmLiteTestbenchSpec): string {
  const lines: string[] = [
    `interface ${spec.interfaceName};`,
    `  logic [31:0] ${spec.operandAName};`,
    `  logic [31:0] ${spec.operandBName};`,
  ];

  for (const operation of spec.operations) {
    lines.push(`  logic [31:0] ${operation.outputSignal};`);
  }

  lines.push('endinterface');
  lines.push('');
  return lines.join('\n');
}

function emitCheckTask(spec: UvmLiteTestbenchSpec): string {
  const checks = spec.operations
    .map(operation => {
      const expectedExpression = toItemExpression(operation.expectedExpression, spec);
      return `      compare_value(${spec.testbenchModuleName}.vif.${operation.outputSignal}, ${expectedExpression}, {item.label, " ${operation.name}"});`;
    })
    .join('\n');

  return [
    '    task check(alu_item item);',
    checks,
    '    endtask',
    '',
  ].join('\n');
}

function emitVectorCalls(spec: UvmLiteTestbenchSpec): string {
  return spec.vectors
    .map(vector => `      apply_case(${vector.operandA}, ${vector.operandB}, "${vector.label}");`)
    .join('\n');
}

export function generateUvmLiteTestbench(spec: UvmLiteTestbenchSpec): string {
  const instantiations = spec.operations
    .map(op => emitOperationInstantiation(op, 'vif', spec.operandAName, spec.operandBName))
    .join('');

  return [
    '`timescale 1ns / 1ps',
    '`include "uvm_lite_macros.svh"',
    '',
    'import uvm_lite_pkg::*;',
    '',
    emitInterface(spec),
    `module ${spec.testbenchModuleName};`,
    `  ${spec.interfaceName} vif();`,
    '',
    instantiations.trimEnd(),
    '',
    '  class alu_item extends uvm_sequence_item;',
    '    bit [31:0] operand_a;',
    '    bit [31:0] operand_b;',
    '    string label;',
    '',
    '    function new(string name = "alu_item");',
    '      super.new(name);',
    '    endfunction',
    '  endclass',
    '',
    '  class alu_smoke_test extends uvm_test;',
    '    int pass_count;',
    '    int fail_count;',
    '',
    '    function new(string name = "alu_smoke_test", uvm_component parent = null);',
    '      super.new(name, parent);',
    '      pass_count = 0;',
    '      fail_count = 0;',
    '    endfunction',
    '',
    '    task drive(alu_item item);',
    `      ${spec.testbenchModuleName}.vif.${spec.operandAName} = item.operand_a;`,
    `      ${spec.testbenchModuleName}.vif.${spec.operandBName} = item.operand_b;`,
    '      #1;',
    '    endtask',
    '',
    '    function void compare_value(bit [31:0] actual, bit [31:0] expected, string label);',
    '      if (actual === expected) begin',
    '        pass_count++;',
    '      end else begin',
    '        fail_count++;',
    '        `uvm_error("ALU_SCOREBOARD", $sformatf("%0s got 0x%08h expected 0x%08h", label, actual, expected));',
    '      end',
    '    endfunction',
    '',
    emitCheckTask(spec).trimEnd(),
    '',
    '    task apply_case(bit [31:0] operand_a, bit [31:0] operand_b, string label);',
    '      alu_item item;',
    '      item = new("item");',
    '      item.operand_a = operand_a;',
    '      item.operand_b = operand_b;',
    '      item.label = label;',
    '      drive(item);',
    '      check(item);',
    '      `uvm_info("ALU_TEST", $sformatf("checked %0s", label), UVM_LOW);',
    '    endtask',
    '',
    '    virtual task run_phase();',
    emitVectorCalls(spec),
    '    endtask',
    '  endclass',
    '',
    '  initial begin',
    '    alu_smoke_test test;',
    '    test = new("alu_smoke_test", null);',
    '',
    '    `uvm_info("ALU_TB", "Starting simple UVM-style ALU smoke test", UVM_LOW);',
    '    test.run_phase();',
    '',
    '    $display("alu uvm-lite testbench: %0d passed, %0d failed", test.pass_count, test.fail_count);',
    '    if (test.fail_count > 0) begin',
    '      $finish(1);',
    '    end',
    '    $finish(0);',
    '  end',
    'endmodule',
    '',
  ].join('\n');
}
