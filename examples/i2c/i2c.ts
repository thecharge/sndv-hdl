// I2C: combinational building blocks for an I2C master/slave controller.
// The I2C protocol uses SDA (data) and SCL (clock) open-drain signals.
// Compile: ts2v compile examples/i2c.ts -o build/i2c.v

// Address matcher: compare received 7-bit address with device address.
function i2c_address_match(received_address: number, device_address: number): boolean {
  const masked_received: number = received_address & 0x7F;
  const masked_device: number = device_address & 0x7F;
  return masked_received === masked_device;
}

// Read/write bit extractor: bit 0 of the address byte (1=read, 0=write).
function i2c_is_read_operation(address_byte: number): boolean {
  return (address_byte & 1) !== 0;
}

// ACK/NACK detector: SDA low during 9th clock = ACK, high = NACK.
function i2c_is_ack(sda_value: boolean): boolean {
  if (sda_value) { return false; } else { return true; }
}

// Bit counter next: count 0..8 (8 data bits + 1 ACK bit per byte).
function i2c_bit_counter_next(current_count: number, scl_rising: boolean): number {
  if (scl_rising) {
    if (current_count === 8) { return 0; } else { return current_count + 1; }
  } else {
    return current_count;
  }
}

// Byte complete: true when 8 data bits have been clocked in.
function i2c_byte_complete(bit_counter: number): boolean {
  return bit_counter === 8;
}

// SDA output for master TX: drive data bit or release for ACK.
function i2c_master_sda_out(data_byte: number, bit_counter: number, awaiting_ack: boolean): boolean {
  if (awaiting_ack) {
    return true;
  } else {
    const bit_position: number = 7 - bit_counter;
    const shifted: number = data_byte >> bit_position;
    return (shifted & 1) !== 0;
  }
}

// SCL clock divider tick: generate SCL transitions from system clock.
function i2c_scl_divider_tick(divider_counter: number, divider_limit: number): boolean {
  return divider_counter === divider_limit;
}

// SCL divider next value.
function i2c_scl_divider_next(divider_counter: number, divider_limit: number): number {
  if (divider_counter === divider_limit) { return 0; } else { return divider_counter + 1; }
}

// Start condition detector: SDA falls while SCL is high.
function i2c_start_detected(sda_current: boolean, sda_previous: boolean, scl_current: boolean): boolean {
  if (scl_current) {
    if (sda_previous) {
      if (sda_current) { return false; } else { return true; }
    } else {
      return false;
    }
  } else {
    return false;
  }
}

// Stop condition detector: SDA rises while SCL is high.
function i2c_stop_detected(sda_current: boolean, sda_previous: boolean, scl_current: boolean): boolean {
  if (scl_current) {
    if (sda_previous) {
      return false;
    } else {
      if (sda_current) { return true; } else { return false; }
    }
  } else {
    return false;
  }
}

// Bus arbitration: detect if another master is driving SDA low when we expect high.
function i2c_arbitration_lost(expected_sda: boolean, actual_sda: boolean): boolean {
  if (expected_sda) {
    if (actual_sda) { return false; } else { return true; }
  } else {
    return false;
  }
}

// Clock stretching detector: slave holds SCL low to pause master.
function i2c_clock_stretched(scl_expected_high: boolean, scl_actual: boolean): boolean {
  if (scl_expected_high) {
    if (scl_actual) { return false; } else { return true; }
  } else {
    return false;
  }
}
