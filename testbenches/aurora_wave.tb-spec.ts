// TypeScript testbench spec for the aurora_wave demo.
// Sources (compiled together):
//   examples/hardware/tang_nano_20k/aurora_wave/aurora_serialiser.ts
//   examples/hardware/tang_nano_20k/aurora_wave/aurora_gen.ts
//   examples/hardware/tang_nano_20k/aurora_wave/aurora_wave.ts
//
// AuroraSerialiser behaviour under test:
//   - Starts in RESET phase (ws2812 = 0)
//   - After 10000 clocks: loads pixel0 into shiftReg and starts BITS phase
//   - Drives ws2812 HIGH for bits [23:20] (T0H window) on every bit slot
//   - pixelIdx advances 0->7 as each 24-bit pixel is consumed
//   - After pixel7, returns to RESET phase
//
// AuroraGen behaviour under test:
//   - hue0 = (phase >> 24) & 0xF
//   - hue1 = hue0 + 2 (mod 16)
//   - palette: hue 0 -> pixel0 = 0x00CC00 (red GRB), hue 8 -> pixel0 = 0xCC00CC (cyan GRB)
//   - btn = 1: phase increments by 8 per clock (fast mode)
//   - btn = 0: phase increments by 1 per clock (normal mode)
//   - board LED reflects ledCyc = (phase >> 23) & 0xF

import type { SeqTestSpec } from './tb-spec-types';

// Testbench for the 8-pixel serialiser in isolation.
export const auroraSerialiserSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'AuroraSerialiser',
    sourceFile: 'examples/hardware/tang_nano_20k/aurora_wave',
    clock: 'clk',
    clockHalfPeriodNs: 18,  // ~27 MHz
    checks: [
        // After power-on: serialiser is in RESET phase, ws2812 held low.
        {
            label: 'reset_phase_ws2812_low',
            forcedSignals: { phase: "1'b0", timer: "14'd0" },
            expectedSignals: { ws2812: "1'b0" },
        },
        // At start of BITS phase, bit 23 of shiftReg (MSB) drives T0H high.
        // Force phase=BITS and timer=0: ws2812 must be high (always T0H at timer=0).
        {
            label: 'bits_phase_timer0_ws2812_high',
            forcedSignals: { phase: "1'b1", timer: "14'd0", shiftReg: "24'h000000" },
            expectedSignals: { ws2812: "1'b1" },
        },
        // After T0H_CLOCKS (timer=9), a zero bit goes low.
        {
            label: 'bits_phase_zero_bit_low_after_t0h',
            forcedSignals: { phase: "1'b1", timer: "14'd9", shiftReg: "24'h000000" },
            expectedSignals: { ws2812: "1'b0" },
        },
        // After T0H_CLOCKS (timer=9), a one bit stays high (extends through T1H).
        {
            label: 'bits_phase_one_bit_high_after_t0h',
            forcedSignals: { phase: "1'b1", timer: "14'd9", shiftReg: "24'h800000" },
            expectedSignals: { ws2812: "1'b1" },
        },
        // pixelIdx starts at 0 after RESET->BITS transition.
        {
            label: 'pixel_idx_zero_at_bits_start',
            forcedSignals: { phase: "1'b1", pixelIdx: "3'd0" },
            expectedSignals: { pixelIdx: "3'd0" },
        },
    ],
};

// Testbench for the colour generator in isolation.
export const auroraGenSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'AuroraGen',
    sourceFile: 'examples/hardware/tang_nano_20k/aurora_wave',
    clock: 'clk',
    clockHalfPeriodNs: 18,
    checks: [
        // With phase at 0, hue0 = 0, pixel0 = PAL_0 = 0x00CC00 (red GRB).
        {
            label: 'hue0_palette_entry_0_is_red',
            forcedSignals: { hue0: "4'd0" },
            expectedSignals: { pixel0: "24'h00CC00" },
        },
        // hue0 = 8 -> palette entry 8 = 0xCC00CC (cyan GRB).
        {
            label: 'hue0_palette_entry_8_is_cyan',
            forcedSignals: { hue0: "4'd8" },
            expectedSignals: { pixel0: "24'hCC00CC" },
        },
        // hue4 = 4 -> pixel4 = PAL_4 = 0xCC6600 (yellow GRB).
        {
            label: 'hue4_palette_entry_4_is_yellow',
            forcedSignals: { hue4: "4'd4" },
            expectedSignals: { pixel4: "24'hCC6600" },
        },
        // Board LED: ledCyc = 0 (bits[26:23] = 0) -> LED_0 = 0x3E.
        {
            label: 'led_cyc_0_drives_led0',
            forcedSignals: { phase: "28'd0" },
            expectedSignals: { led: "6'h3E" },
        },
        // Fast mode: btn = 1, phase should increment by 8 per clock.
        // After one clock from phase=0: phase should be 8.
        {
            label: 'btn_held_phase_increments_by_8',
            forcedSignals: { btn: "1'b1", phase: "28'd0" },
            expectedSignals: { phase: "28'd8" },
        },
        // Normal mode: btn = 0, phase increments by 1.
        {
            label: 'btn_idle_phase_increments_by_1',
            forcedSignals: { btn: "1'b0", phase: "28'd100" },
            expectedSignals: { phase: "28'd101" },
        },
    ],
};
