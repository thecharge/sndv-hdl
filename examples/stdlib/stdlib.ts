// Standard library: reusable combinational building blocks.
// Compile: ts2v compile examples/stdlib.ts -o build/stdlib.v

// 2-to-1 multiplexer: select input_a when selector is true.
function mux2(selector: boolean, input_a: number, input_b: number): number {
  if (selector) { return input_a; } else { return input_b; }
}

// 4-to-1 multiplexer: select by 2-bit control (bit 1 and bit 0).
function mux4(sel_bit1: boolean, sel_bit0: boolean, in0: number, in1: number, in2: number, in3: number): number {
  if (sel_bit1) {
    if (sel_bit0) { return in3; } else { return in2; }
  } else {
    if (sel_bit0) { return in1; } else { return in0; }
  }
}

// 2-to-4 decoder: activate one output line based on 2-bit address.
function decoder2to4(addr_bit1: boolean, addr_bit0: boolean): number {
  if (addr_bit1) {
    if (addr_bit0) { return 8; } else { return 4; }
  } else {
    if (addr_bit0) { return 2; } else { return 1; }
  }
}

// Priority encoder: returns index of highest set bit (simplified 4-bit).
function priority_encoder_4bit(in3: boolean, in2: boolean, in1: boolean, in0: boolean): number {
  if (in3) { return 3; } else {
    if (in2) { return 2; } else {
      if (in1) { return 1; } else { return 0; }
    }
  }
}

// Even parity generator: XOR reduction of 8 data bits (manual unroll).
function parity_8bit(d7: number, d6: number, d5: number, d4: number, d3: number, d2: number, d1: number, d0: number): number {
  const p01: number = d0 ^ d1;
  const p23: number = d2 ^ d3;
  const p45: number = d4 ^ d5;
  const p67: number = d6 ^ d7;
  const p03: number = p01 ^ p23;
  const p47: number = p45 ^ p67;
  return p03 ^ p47;
}

// Minimum of two unsigned values.
function min_unsigned(value_a: number, value_b: number): number {
  if (value_a < value_b) { return value_a; } else { return value_b; }
}

// Maximum of two unsigned values.
function max_unsigned(value_a: number, value_b: number): number {
  if (value_a > value_b) { return value_a; } else { return value_b; }
}

// Saturating add: clamp at max 32-bit value on overflow detection.
function saturating_add(operand_a: number, operand_b: number): number {
  const sum: number = operand_a + operand_b;
  if (sum < operand_a) { return 0xFFFFFFFF; } else { return sum; }
}

// Barrel shift left by fixed amount (4 bits).
function barrel_shift_left_4(data_in: number): number {
  return data_in << 4;
}

// Barrel shift right by fixed amount (4 bits).
function barrel_shift_right_4(data_in: number): number {
  return data_in >> 4;
}

// Bit field extract: mask lower N bits (8-bit mask).
function extract_lower_byte(data_in: number): number {
  return data_in & 0xFF;
}

// Bit field extract: mask upper byte from 16-bit value.
function extract_upper_byte(data_in: number): number {
  return (data_in >> 8) & 0xFF;
}
