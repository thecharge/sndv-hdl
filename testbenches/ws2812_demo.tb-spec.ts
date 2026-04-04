// TypeScript testbench spec for the ws2812_demo flagship example.
// Sources (compiled together):
//   examples/hardware/tang_nano_20k/ws2812_demo/ws2812_serialiser.ts
//   examples/hardware/tang_nano_20k/ws2812_demo/rainbow_gen.ts
//   examples/hardware/tang_nano_20k/ws2812_demo/ws2812_demo.ts
//
// Behaviour under test (Ws2812Demo top level):
//   btn = 0 (hold S2) → enable=1 → RainbowGen cycles colours; load pulses the serialiser
//   btn = 1 (release)  → enable=0 → frame=0x000000, load=0, rainbow resets
//   rst_n = 0 (hold S1) → LEDs walk one at a time
//   rst_n = 1 (release) → all LEDs off; walkTick + ledPhase reset
//
// RainbowGen colour palette (GRB format):
//   step 0 → 0x00CC00 RED     step 1 → 0xCCCC00 YELLOW
//   step 2 → 0xCC0000 GREEN   step 3 → 0xCC00CC CYAN
//   step 4 → 0x0000CC BLUE    step 5 → 0x00CCCC MAGENTA

import type { SeqTestSpec } from '@ts2v/types';

export const ws2812DemoSpec: SeqTestSpec = {
    kind: 'sequential',
    module: 'Ws2812Demo',
    sourceFile: 'examples/hardware/tang_nano_20k/ws2812_demo',
    clock: 'clk',
    clockHalfPeriodNs: 18, // ~27 MHz
    checks: [
        // ── RainbowGen: button held → enable asserted ──────────────────────
        {
            label: 'btn_held_enable_high',
            forcedSignals: { btn: "1'b0" },
            expectedSignals: { enable: "1'b1" },
        },
        // ── RainbowGen: button released → enable low, frame black ──────────
        {
            label: 'btn_idle_enable_low',
            forcedSignals: { btn: "1'b1" },
            expectedSignals: { enable: "1'b0" },
        },
        // ── RainbowGen: step 0 = RED ───────────────────────────────────────
        {
            label: 'rainbow_step0_red',
            forcedSignals: { 'rainbow.step': "3'd0", 'rainbow.enable': "1'b1" },
            expectedSignals: { frame: "24'h00CC00" },
        },
        // ── RainbowGen: step 3 = CYAN ──────────────────────────────────────
        {
            label: 'rainbow_step3_cyan',
            forcedSignals: { 'rainbow.step': "3'd3", 'rainbow.enable': "1'b1" },
            expectedSignals: { frame: "24'hCC00CC" },
        },
        // ── LED walk: S1 idle → all LEDs off ──────────────────────────────
        {
            label: 's1_idle_leds_off',
            forcedSignals: { rst_n: "1'b1" },
            expectedSignals: { led: "6'h3f" },
        },
        // ── LED walk: S1 held, phase 0 → LED0 on ─────────────────────────
        {
            label: 's1_held_phase0_led0_on',
            forcedSignals: { rst_n: "1'b0", ledPhase: "3'd0" },
            expectedSignals: { led: "6'h3e" },
        },
    ],
};

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
