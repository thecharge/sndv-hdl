import type { SeqTestSpec } from '@ts2v/types';

// ---------------------------------------------------------------------------
// Generic sequential module testbench generator (consumes SeqTestSpec).
// Supports multi-clock designs via spec.clocks[]; backward-compatible with
// single-clock designs that only set spec.clock / spec.clockHalfPeriodNs.
// ---------------------------------------------------------------------------

function buildClockList(spec: SeqTestSpec): { name: string; halfPeriodNs: number }[] {
  const extra = spec.clocks ?? [];
  const primaryAlreadyListed = extra.some(c => c.name === spec.clock);
  if (primaryAlreadyListed) return extra;
  return [{ name: spec.clock, halfPeriodNs: spec.clockHalfPeriodNs }, ...extra];
}

function emitClockToggle(clkName: string, halfPeriodNs: number): string[] {
  return [
    '  initial begin',
    `    ${clkName} = 1\'b0;`,
    `    forever #${halfPeriodNs} ${clkName} = ~${clkName};`,
    '  end',
  ];
}

function emitResetSequence(spec: SeqTestSpec, clocks: { name: string; halfPeriodNs: number }[]): string[] {
  if (!spec.reset) return [];
  const longestHalf = Math.max(...clocks.map(c => c.halfPeriodNs));
  const deassertAfterNs = longestHalf * 4;
  return [
    '  initial begin',
    `    ${spec.reset} = 1\'b0;`,
    `    #${deassertAfterNs};`,
    `    ${spec.reset} = 1\'b1;`,
    '  end',
  ];
}

/** Generate a UVM-lite sequential testbench from a `SeqTestSpec`. */
export function generateSeqTestbench(spec: SeqTestSpec): string {
  const clocks = buildClockList(spec);
  const tbName = `tb_${spec.module.toLowerCase()}`;

  const portDecls = clocks.map(c => `  logic ${c.name};`);
  if (spec.reset) portDecls.push(`  logic ${spec.reset};`);

  const dutPorts = clocks.map(c => `    .${c.name}(${c.name}),`);
  if (spec.reset) dutPorts.push(`    .${spec.reset}(${spec.reset}),`);

  const clockToggles = clocks.flatMap(c => emitClockToggle(c.name, c.halfPeriodNs));
  const resetSeq = emitResetSequence(spec, clocks);

  const checkLines = spec.checks.flatMap(ch => {
    const lines: string[] = [`    // ${ch.label}`];
    for (const [sig, val] of Object.entries(ch.forcedSignals)) {
      lines.push(`    force dut.${sig} = ${val};`);
    }
    lines.push(`    @(posedge ${spec.clock});`);
    lines.push('    #1;');
    for (const [sig, expected] of Object.entries(ch.expectedSignals)) {
      lines.push(`    if (dut.${sig} !== ${expected}) begin`);
      lines.push(`      $display("FAIL ${ch.label}: ${sig} got %0h expected %0h", dut.${sig}, ${expected});`);
      lines.push('      fail_count = fail_count + 1;');
      lines.push('    end else begin');
      lines.push('      pass_count = pass_count + 1;');
      lines.push('    end');
    }
    for (const sig of Object.keys(ch.forcedSignals)) {
      lines.push(`    release dut.${sig};`);
    }
    return lines;
  });

  return [
    '`timescale 1ns / 1ps',
    '',
    `module ${tbName};`,
    ...portDecls,
    '',
    `  ${spec.module} dut (`,
    ...dutPorts.map((l, i) => i === dutPorts.length - 1 ? l.replace(/,$/, '') : l),
    '  );',
    '',
    ...clockToggles,
    '',
    ...resetSeq,
    '',
    '  integer pass_count = 0;',
    '  integer fail_count = 0;',
    '',
    '  initial begin',
    ...checkLines,
    `    $display("${spec.module} testbench: %0d passed, %0d failed", pass_count, fail_count);`,
    '    if (fail_count > 0) $finish(1);',
    '    $finish(0);',
    '  end',
    'endmodule',
    '',
  ].join('\n');
}

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
