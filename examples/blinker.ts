// Blinker: combinational building blocks for an LED toggle controller.
// Compose with an always_ff register to create a complete blinker.
// Compile: ts2v compile examples/blinker.ts -o build/blinker.v

// Counter next-value: increment or wrap to zero at threshold.
function blinker_counter_next(current_count: number, max_count: number): number {
  if (current_count === max_count) { return 0; } else { return current_count + 1; }
}

// Toggle output: flip the LED state when counter reaches threshold.
function blinker_toggle(current_count: number, max_count: number, current_led: boolean): boolean {
  if (current_count === max_count) {
    if (current_led) { return false; } else { return true; }
  } else {
    return current_led;
  }
}

// Prescaler: divide clock by a power-of-two for slower blink rates.
function blinker_prescaler_next(prescaler_count: number, prescaler_limit: number): number {
  if (prescaler_count === prescaler_limit) { return 0; } else { return prescaler_count + 1; }
}

// Prescaler tick: output true for one cycle when prescaler wraps.
function blinker_prescaler_tick(prescaler_count: number, prescaler_limit: number): boolean {
  return prescaler_count === prescaler_limit;
}

// Multi-LED pattern: cycle through 4 patterns based on 2-bit selector.
function blinker_pattern(pattern_sel_bit1: boolean, pattern_sel_bit0: boolean): number {
  if (pattern_sel_bit1) {
    if (pattern_sel_bit0) { return 0x0F; } else { return 0xF0; }
  } else {
    if (pattern_sel_bit0) { return 0xAA; } else { return 0x55; }
  }
}

// Pattern selector next: advance pattern after each full blink cycle.
function blinker_pattern_next(current_pattern: number, blink_done: boolean): number {
  if (blink_done) {
    if (current_pattern === 3) { return 0; } else { return current_pattern + 1; }
  } else {
    return current_pattern;
  }
}
