// WS2812: combinational building blocks for addressable LED (NeoPixel) driver.
// The WS2812 protocol encodes bits as timed high/low pulses on a single wire.
// Compile: ts2v compile examples/ws2812.ts -o build/ws2812.v

// Bit encoder: output high during T0H/T1H period based on bit value.
// WS2812 timing: '0' = 400ns high + 850ns low, '1' = 800ns high + 450ns low.
function ws2812_bit_output(cycle_counter: number, data_bit: boolean, cycles_t0h: number, cycles_t1h: number): boolean {
  if (data_bit) {
    return cycle_counter < cycles_t1h;
  } else {
    return cycle_counter < cycles_t0h;
  }
}

// Cycle counter next: increment within bit period, wrap at total.
function ws2812_cycle_counter_next(cycle_counter: number, cycles_per_bit: number): number {
  if (cycle_counter === cycles_per_bit) { return 0; } else { return cycle_counter + 1; }
}

// Bit counter next: advance to next bit when cycle counter wraps.
function ws2812_bit_counter_next(bit_counter: number, cycle_counter: number, cycles_per_bit: number): number {
  if (cycle_counter === cycles_per_bit) {
    if (bit_counter === 23) { return 0; } else { return bit_counter + 1; }
  } else {
    return bit_counter;
  }
}

// LED index next: advance to next LED when all 24 bits sent.
function ws2812_led_index_next(led_index: number, bit_counter: number, cycle_counter: number, cycles_per_bit: number, led_count: number): number {
  if (cycle_counter === cycles_per_bit) {
    if (bit_counter === 23) {
      if (led_index === led_count) { return 0; } else { return led_index + 1; }
    } else {
      return led_index;
    }
  } else {
    return led_index;
  }
}

// GRB color pack: combine 8-bit R, G, B into 24-bit GRB word (WS2812 order).
function ws2812_pack_grb(red: number, green: number, blue: number): number {
  const green_shifted: number = (green & 0xFF) << 16;
  const red_shifted: number = (red & 0xFF) << 8;
  const blue_masked: number = blue & 0xFF;
  return green_shifted | red_shifted | blue_masked;
}

// Extract single bit from 24-bit GRB word at given position (MSB first).
function ws2812_extract_bit(grb_word: number, bit_position: number): boolean {
  const inverted_position: number = 23 - bit_position;
  const shifted: number = grb_word >> inverted_position;
  return shifted & 1;
}

// Reset detector: output true when in reset phase (>50us low).
function ws2812_in_reset_phase(reset_counter: number, reset_cycles: number): boolean {
  return reset_counter < reset_cycles;
}

// Data line output: mux between reset (low), bit encoding, and idle.
function ws2812_data_output(in_reset: boolean, in_transmission: boolean, bit_output: boolean): boolean {
  if (in_reset) {
    return false;
  } else {
    if (in_transmission) { return bit_output; } else { return false; }
  }
}

// Brightness scaler: multiply color channel by 8-bit brightness (upper 8 bits of product).
function ws2812_scale_brightness(color_channel: number, brightness: number): number {
  const product: number = (color_channel & 0xFF) * (brightness & 0xFF);
  return (product >> 8) & 0xFF;
}
