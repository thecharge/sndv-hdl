// UART TX: combinational building blocks for serial byte transmission.
// Compose with a clocked FSM to create a complete UART transmitter.
// Compile: ts2v compile examples/uart_tx.ts -o build/uart_tx.v

// Baud rate divisor: tick output when counter reaches divisor value.
function uart_baud_tick(baud_counter: number, baud_divisor: number): boolean {
  return baud_counter === baud_divisor;
}

// Baud counter next: increment or reset on tick.
function uart_baud_counter_next(baud_counter: number, baud_divisor: number): number {
  if (baud_counter === baud_divisor) { return 0; } else { return baud_counter + 1; }
}

// Bit selector: extract bit at position from data byte (8-bit, LSB first).
function uart_bit_select(data_byte: number, bit_index: number): boolean {
  const shifted: number = data_byte >> bit_index;
  return (shifted & 1) !== 0;
}

// TX line output: mux between idle, start, data, and stop based on state.
// States: 0=idle(high), 1=start(low), 2=data(bit), 3=stop(high).
function uart_tx_output(state: number, data_bit: boolean): boolean {
  if (state === 1) {
    return false;
  } else {
    if (state === 2) {
      return data_bit;
    } else {
      return true;
    }
  }
}

// State transition: advance UART TX FSM (0=idle, 1=start, 2=data, 3=stop).
function uart_state_next(current_state: number, baud_tick: boolean, start_trigger: boolean, bit_count: number): number {
  if (current_state === 0) {
    if (start_trigger) { return 1; } else { return 0; }
  } else {
    if (baud_tick) {
      if (current_state === 1) {
        return 2;
      } else {
        if (current_state === 2) {
          if (bit_count === 7) { return 3; } else { return 2; }
        } else {
          return 0;
        }
      }
    } else {
      return current_state;
    }
  }
}

// Bit counter next: increment during data phase, reset otherwise.
function uart_bit_counter_next(current_count: number, current_state: number, baud_tick: boolean): number {
  if (current_state === 2) {
    if (baud_tick) { return current_count + 1; } else { return current_count; }
  } else {
    return 0;
  }
}

// Busy flag: active during start, data, or stop states.
function uart_is_busy(current_state: number): boolean {
  if (current_state === 0) { return false; } else { return true; }
}

// Frame error detector: check stop bit is high.
function uart_frame_valid(stop_bit_value: boolean): boolean {
  if (stop_bit_value) { return true; } else { return false; }
}
