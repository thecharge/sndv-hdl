export interface BlinkyPhaseCheck {
  label: string;
  phase: string;
  expectedLed: string;
}

export interface BlinkyUvmLiteSpec {
  testbenchModuleName: string;
  dutModuleName: string;
  interfaceName: string;
  clockSignal: string;
  ledSignal: string;
  dutCounterSignal: string;
  dutPhaseSignal: string;
  counterWidth: number;
  clockHalfPeriodNs: number;
  checks: BlinkyPhaseCheck[];
}

export function generateBlinkyUvmLiteTestbench(spec: BlinkyUvmLiteSpec): string {
  const checkCalls = spec.checks
    .map(
      c =>
        `      drive_and_check(${c.phase}, ${c.expectedLed}, "${c.label}");`,
    )
    .join('\n');

  return [
    '`timescale 1ns / 1ps',
    '`include "uvm_lite_macros.svh"',
    '',
    'import uvm_lite_pkg::*;',
    '',
    `interface ${spec.interfaceName};`,
    `  logic ${spec.clockSignal};`,
    `  logic [5:0] ${spec.ledSignal};`,
    'endinterface',
    '',
    `module ${spec.testbenchModuleName};`,
    `  ${spec.interfaceName} vif();`,
    '',
    `  ${spec.dutModuleName} dut (`,
    `    .${spec.clockSignal}(vif.${spec.clockSignal}),`,
    `    .${spec.ledSignal}(vif.${spec.ledSignal})`,
    '  );',
    '',
    '  initial begin',
    `    vif.${spec.clockSignal} = 1'b0;`,
    `    forever #${spec.clockHalfPeriodNs} vif.${spec.clockSignal} = ~vif.${spec.clockSignal};`,
    '  end',
    '',
    '  class blinky_smoke_test extends uvm_test;',
    '    int pass_count;',
    '    int fail_count;',
    '',
    '    function new(string name = "blinky_smoke_test", uvm_component parent = null);',
    '      super.new(name, parent);',
    '      pass_count = 0;',
    '      fail_count = 0;',
    '    endfunction',
    '',
    '    function void compare_led(bit [5:0] actual, bit [5:0] expected, string label);',
    '      if (actual === expected) begin',
    '        pass_count++;',
    '      end else begin',
    '        fail_count++;',
    '        `uvm_error("BLINKY_SCOREBOARD", $sformatf("%0s got 0x%02h expected 0x%02h", label, actual, expected));',
    '      end',
    '    endfunction',
    '',
    '    task drive_and_check(bit [2:0] forced_phase, bit [5:0] expected_led, string label);',
    `      ${spec.testbenchModuleName}.dut.${spec.dutPhaseSignal} = forced_phase;`,
    `      ${spec.testbenchModuleName}.dut.${spec.dutCounterSignal} = {${spec.counterWidth}{1'b0}};`,
    `      @(posedge ${spec.testbenchModuleName}.vif.${spec.clockSignal});`,
    '      #1;',
    `      compare_led(${spec.testbenchModuleName}.vif.${spec.ledSignal}, expected_led, label);`,
    '      `uvm_info("BLINKY_TEST", $sformatf("checked %0s", label), UVM_LOW);',
    '    endtask',
    '',
    '    virtual task run_phase();',
    '      // Active-low LED pattern validation for all deterministic phases.',
    checkCalls,
    '    endtask',
    '  endclass',
    '',
    '  initial begin',
    '    blinky_smoke_test test;',
    '    test = new("blinky_smoke_test", null);',
    '',
    '    `uvm_info("BLINKY_TB", "Starting simple UVM-style Blinker smoke test", UVM_LOW);',
    '    test.run_phase();',
    '',
    '    $display("blinky uvm-lite testbench: %0d passed, %0d failed", test.pass_count, test.fail_count);',
    '    if (test.fail_count > 0) begin',
    '      $finish(1);',
    '    end',
    '    $finish(0);',
    '  end',
    'endmodule',
    '',
  ].join('\n');
}
