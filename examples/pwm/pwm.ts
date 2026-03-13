// PWM: combinational building blocks for pulse width modulation.
// Compose with a clocked counter register for a complete PWM generator.
// Compile: ts2v compile examples/pwm.ts -o build/pwm.v

// PWM comparator: output high when counter is below duty cycle threshold.
function pwm_output(counter_value: number, duty_cycle: number): boolean {
  return counter_value < duty_cycle;
}

// Counter next-value: free-running wrap-around increment.
function pwm_counter_next(current_count: number, max_count: number): number {
  if (current_count === max_count) { return 0; } else { return current_count + 1; }
}

// Dead-time inserter: create non-overlapping complementary outputs.
function pwm_with_deadtime(counter_value: number, duty_cycle: number, deadtime: number): boolean {
  if (counter_value < deadtime) {
    return false;
  } else {
    if (counter_value < duty_cycle) { return true; } else { return false; }
  }
}

// Complementary output: inverted PWM for H-bridge drivers.
function pwm_complementary(counter_value: number, duty_cycle: number, deadtime: number): boolean {
  if (counter_value < duty_cycle) {
    return false;
  } else {
    if (counter_value < duty_cycle + deadtime) { return false; } else { return true; }
  }
}

// Duty cycle limiter: clamp duty cycle to safe range.
function pwm_clamp_duty(requested_duty: number, max_duty: number, min_duty: number): number {
  if (requested_duty > max_duty) {
    return max_duty;
  } else {
    if (requested_duty < min_duty) { return min_duty; } else { return requested_duty; }
  }
}

// Center-aligned PWM: symmetric output around counter midpoint.
function pwm_center_aligned(counter_value: number, half_period: number, duty_cycle: number): boolean {
  const half_duty: number = duty_cycle >> 1;
  const lower_threshold: number = half_period - half_duty;
  const upper_threshold: number = half_period + half_duty;
  if (counter_value < lower_threshold) {
    return false;
  } else {
    if (counter_value > upper_threshold) { return false; } else { return true; }
  }
}

// Phase offset: shift PWM start point for multi-phase motor control.
function pwm_phase_offset(counter_value: number, duty_cycle: number, phase_offset: number): boolean {
  const shifted_counter: number = counter_value + phase_offset;
  return shifted_counter < duty_cycle;
}
