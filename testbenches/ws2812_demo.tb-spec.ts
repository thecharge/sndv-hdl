// TypeScript testbench spec for the ws2812_demo hardware example.
// Source: examples/hardware/tang_nano_20k/ws2812_demo/ws2812_demo.ts
//
// Behaviour under test:
//   - btn = 0 (held)  → frame driven to RED (0x00CC00 GRB)
//   - btn = 1 (idle)  → frame driven to 0x000000 (off)
//   - rst_n = 0 (held) → walkTick increments; LEDs advance per phase
//   - rst_n = 1 (idle) → all LEDs off; walkTick and ledPhase reset to 0
//   - WS2812 serialiser: always_ff generates ws2812=1 during high window

import type { SeqTestSpec } from './tb-spec-types';

export const ws2812DemoSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'Ws2812InteractiveDemo',
    sourceFile: 'examples/hardware/tang_nano_20k/ws2812_demo/ws2812_demo.ts',
    clock: 'clk',
    clockHalfPeriodNs: 18, // ~27 MHz (18.5 ns half-period)
    checks: [
        // ---- WS2812 colour: button held → RED frame ----
        {
            label: 'btn_held_frame_is_red',
            forcedSignals: { btn: "1'b0" },
            expectedSignals: { frame: "24'h00CC00" },
        },
        // ---- WS2812 colour: button idle → OFF frame ----
        {
            label: 'btn_idle_frame_is_off',
            forcedSignals: { btn: "1'b1" },
            expectedSignals: { frame: "24'h000000" },
        },
        // ---- LED walk: S1 idle → all LEDs off ----
        {
            label: 's1_idle_leds_off',
            forcedSignals: { rst_n: "1'b1" },
            expectedSignals: { led: "6'h3f" },
        },
        // ---- LED walk: S1 held, phase 0 → LED 0 on ----
        {
            label: 's1_held_phase0_led0_on',
            forcedSignals: { rst_n: "1'b0", ledPhase: "3'd0" },
            expectedSignals: { led: "6'h3e" },
        },
        // ---- LED walk: S1 held, phase 3 → LED 3 on ----
        {
            label: 's1_held_phase3_led3_on',
            forcedSignals: { rst_n: "1'b0", ledPhase: "3'd3" },
            expectedSignals: { led: "6'h37" },
        },
        // ---- S1 release: walk state resets ----
        {
            label: 's1_release_walk_state_resets',
            forcedSignals: { rst_n: "1'b1", walkTick: "24'hABCDEF", ledPhase: "3'd4" },
            expectedSignals: { walkTick: "24'h0", ledPhase: "3'd0", led: "6'h3f" },
        },
    ],
};
