import { BlinkyUvmLiteSpec } from '../../../packages/core/src/compiler/verification/uvm-lite-blinky-testbench-generator';

export const blinkyUvmSpec: BlinkyUvmLiteSpec = {
  testbenchModuleName: 'tb_blinky_uvm',
  dutModuleName: 'Blinker',
  interfaceName: 'blinky_if',
  clockSignal: 'clk',
  ledSignal: 'led',
  dutCounterSignal: 'counter',
  dutPhaseSignal: 'phase',
  counterWidth: 25,
  clockHalfPeriodNs: 5,
  checks: [
    { label: 'phase0_led0_on', phase: "3'd0", expectedLed: "6'h3e" },
    { label: 'phase1_led1_on', phase: "3'd1", expectedLed: "6'h3d" },
    { label: 'phase2_led2_on', phase: "3'd2", expectedLed: "6'h3b" },
    { label: 'phase3_led3_on', phase: "3'd3", expectedLed: "6'h37" },
    { label: 'phase4_led4_on', phase: "3'd4", expectedLed: "6'h2f" },
    { label: 'phase5_led5_on', phase: "3'd5", expectedLed: "6'h1f" },
  ],
};
