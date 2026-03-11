// Example: comparator and shift register operations.
// Compile: ts2v compile examples/comparator.ts -o build/comparator.v

function is_greater(value_a: number, value_b: number): boolean {
  return value_a > value_b;
}

function is_equal(value_a: number, value_b: number): boolean {
  return value_a === value_b;
}

function shift_left_by_4(data_in: number): number {
  return data_in << 4;
}

function shift_right_by_4(data_in: number): number {
  return data_in >> 4;
}

function mask_lower_byte(data_in: number): number {
  return data_in & 0xFF;
}
