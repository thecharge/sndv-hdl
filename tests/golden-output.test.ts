// Golden output tests: verify generated Verilog matches expected patterns.
// These tests verify the transpiler produces correct, synthesis-ready output.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { CompilerPipeline } from '../src/pipeline/compiler-pipeline';

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const pipeline = new CompilerPipeline();

function compileExample(filename: string): string {
  const source = fs.readFileSync(path.join(EXAMPLES_DIR, filename), 'utf-8');
  const result = pipeline.compile(source);
  assert.ok(result.success, `Failed to compile ${filename}: ${result.errors.map(e => e.message).join(', ')}`);
  return result.verilog;
}

describe('Golden output: blinker', () => {
  const verilog = compileExample('blinker.ts');

  it('generates blinker_counter_next module with wrap logic', () => {
    assert.ok(verilog.includes('module blinker_counter_next'));
    assert.ok(verilog.includes('input  wire [31:0] current_count'));
    assert.ok(verilog.includes('input  wire [31:0] max_count'));
    assert.ok(verilog.includes('(current_count == max_count)'));
  });

  it('generates blinker_toggle module with conditional flip', () => {
    assert.ok(verilog.includes('module blinker_toggle'));
    assert.ok(verilog.includes('input  wire  current_led'));
  });

  it('generates blinker_pattern module with hex patterns', () => {
    assert.ok(verilog.includes('module blinker_pattern'));
    assert.ok(verilog.includes("32'h0F") || verilog.includes("32'hF"));
    assert.ok(verilog.includes("32'hF0"));
    assert.ok(verilog.includes("32'hAA"));
    assert.ok(verilog.includes("32'h55"));
  });
});

describe('Golden output: UART TX', () => {
  const verilog = compileExample('uart_tx.ts');

  it('generates uart_baud_tick as comparison output', () => {
    assert.ok(verilog.includes('module uart_baud_tick'));
    assert.ok(verilog.includes('output wire  result'));
    assert.ok(verilog.includes('(baud_counter == baud_divisor)'));
  });

  it('generates uart_tx_output with state-based mux', () => {
    assert.ok(verilog.includes('module uart_tx_output'));
    assert.ok(verilog.includes('input  wire [31:0] state'));
    assert.ok(verilog.includes('input  wire  data_bit'));
    assert.ok(verilog.includes('?'));
  });

  it('generates uart_state_next with FSM transitions', () => {
    assert.ok(verilog.includes('module uart_state_next'));
    assert.ok(verilog.includes('bit_count'));
    assert.ok(verilog.includes('start_trigger'));
  });

  it('generates uart_is_busy as state comparison', () => {
    assert.ok(verilog.includes('module uart_is_busy'));
    assert.ok(verilog.includes('current_state'));
  });
});

describe('Golden output: PWM', () => {
  const verilog = compileExample('pwm.ts');

  it('generates pwm_output as comparator', () => {
    assert.ok(verilog.includes('module pwm_output'));
    assert.ok(verilog.includes('(counter_value < duty_cycle)'));
  });

  it('generates pwm_with_deadtime with two thresholds', () => {
    assert.ok(verilog.includes('module pwm_with_deadtime'));
    assert.ok(verilog.includes('deadtime'));
  });

  it('generates pwm_center_aligned with shift for half_duty', () => {
    assert.ok(verilog.includes('module pwm_center_aligned'));
    assert.ok(verilog.includes('>> '));
  });

  it('generates pwm_clamp_duty with min/max bounds', () => {
    assert.ok(verilog.includes('module pwm_clamp_duty'));
    assert.ok(verilog.includes('max_duty'));
    assert.ok(verilog.includes('min_duty'));
  });
});

describe('Golden output: WS2812', () => {
  const verilog = compileExample('ws2812.ts');

  it('generates ws2812_bit_output with T0H/T1H timing select', () => {
    assert.ok(verilog.includes('module ws2812_bit_output'));
    assert.ok(verilog.includes('cycles_t0h'));
    assert.ok(verilog.includes('cycles_t1h'));
  });

  it('generates ws2812_pack_grb with shift and mask', () => {
    assert.ok(verilog.includes('module ws2812_pack_grb'));
    assert.ok(verilog.includes('<< '));
    assert.ok(verilog.includes("32'hFF"));
  });

  it('generates ws2812_extract_bit with MSB-first indexing', () => {
    assert.ok(verilog.includes('module ws2812_extract_bit'));
    assert.ok(verilog.includes("32'd23"));
  });

  it('generates ws2812_scale_brightness with multiply and shift', () => {
    assert.ok(verilog.includes('module ws2812_scale_brightness'));
    assert.ok(verilog.includes('*'));
    assert.ok(verilog.includes('>> '));
  });
});

describe('Golden output: I2C', () => {
  const verilog = compileExample('i2c.ts');

  it('generates i2c_address_match with 7-bit mask', () => {
    assert.ok(verilog.includes('module i2c_address_match'));
    assert.ok(verilog.includes("32'h7F"));
  });

  it('generates i2c_is_read_operation as bit extract', () => {
    assert.ok(verilog.includes('module i2c_is_read_operation'));
    assert.ok(verilog.includes('& '));
  });

  it('generates i2c_start_detected with edge detection logic', () => {
    assert.ok(verilog.includes('module i2c_start_detected'));
    assert.ok(verilog.includes('sda_current'));
    assert.ok(verilog.includes('sda_previous'));
    assert.ok(verilog.includes('scl_current'));
  });

  it('generates i2c_master_sda_out with bit select', () => {
    assert.ok(verilog.includes('module i2c_master_sda_out'));
    assert.ok(verilog.includes('bit_position'));
    assert.ok(verilog.includes('>> '));
  });

  it('generates i2c_arbitration_lost', () => {
    assert.ok(verilog.includes('module i2c_arbitration_lost'));
    assert.ok(verilog.includes('expected_sda'));
    assert.ok(verilog.includes('actual_sda'));
  });
});

describe('Golden output: stdlib', () => {
  const verilog = compileExample('stdlib.ts');

  it('generates mux2 as ternary', () => {
    assert.ok(verilog.includes('module mux2'));
    assert.ok(verilog.includes('selector'));
    assert.ok(verilog.includes('?'));
  });

  it('generates mux4 with nested ternaries', () => {
    assert.ok(verilog.includes('module mux4'));
    const mux4_section = verilog.slice(verilog.indexOf('module mux4'), verilog.indexOf('endmodule', verilog.indexOf('module mux4')));
    const ternary_count = (mux4_section.match(/\?/g) || []).length;
    assert.ok(ternary_count >= 3, `mux4 should have >= 3 ternaries, got ${ternary_count}`);
  });

  it('generates decoder2to4 with distinct output values', () => {
    assert.ok(verilog.includes('module decoder2to4'));
    assert.ok(verilog.includes("32'd1"));
    assert.ok(verilog.includes("32'd2"));
    assert.ok(verilog.includes("32'd4"));
    assert.ok(verilog.includes("32'd8"));
  });

  it('generates parity_8bit with XOR chain', () => {
    assert.ok(verilog.includes('module parity_8bit'));
    const parity_section = verilog.slice(verilog.indexOf('module parity_8bit'), verilog.indexOf('endmodule', verilog.indexOf('module parity_8bit')));
    const xor_count = (parity_section.match(/\^/g) || []).length;
    assert.ok(xor_count >= 7, `parity should have >= 7 XOR ops, got ${xor_count}`);
  });

  it('generates saturating_add with overflow detection', () => {
    assert.ok(verilog.includes('module saturating_add'));
    assert.ok(verilog.includes("32'hFFFFFFFF"));
  });
});
