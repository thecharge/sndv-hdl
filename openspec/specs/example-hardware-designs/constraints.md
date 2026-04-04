# Constraints — example-hardware-designs

---

## Layout Rules (from AGENTS.md — Hard)

- Hardware examples MUST be in `examples/hardware/<board>/<name>/`
- Simulation examples MUST be in `examples/<name>/`
- CPU/SoC TypeScript sources MUST be in `examples/cpu/`
- No flat `examples/*.ts` files — every example gets its own subfolder

---

## Multi-File Compilation

When an example has multiple TypeScript source files, the compilation target MUST be the
directory (or `hw/` subdirectory), not any single `.ts` file. Passing a single file will
miss modules defined in other files and cause synthesis failures.

---

## Client / Hardware Split

The `client/` and `hw/` split exists because the compiler processes all `.ts` files in
the given directory. If client scripts that import Node/Bun APIs are co-located with
hardware source, the compiler will fail trying to compile Node API calls.

This layout MUST be preserved in all examples that include a PC-side component.

---

## WS2812 Protocol Notes (binding for any example using pin 79 on Tang Nano 20K)

- GRB byte order: frame[23:16]=Green, [15:8]=Red, [7:0]=Blue
- At 27 MHz: T0H=9 clocks (333 ns), T1H=19 clocks (703 ns), bit period=30 clocks (1111 ns)
- Reset pulse MUST be >= 280 µs (on-board WS2812C-2020); reference: 10,000 clocks = 370 µs
- Do NOT use the 50 µs reset value (applies only to external WS2812B strips)
- External 5V WS2812B strips may need a 74AHCT125 level shifter for 3.3V FPGA GPIO

---

## Non-Blocking Assignment Semantics in @Sequential

Hardware source authors MUST understand: in `always_ff`, all assignments are non-blocking.
When a helper method is called after a register update, it reads the PRE-update value.
This property is documented in CLAUDE.md and must be noted in examples that rely on it.

---

## Forbidden Patterns in Example Source (strictly enforced)

- `?:` ternary — use `if/else`
- `let`/`var` at module level — use `const`
- Magic numbers in logic — name every constant
- `'ts2sv'` import — use `'@ts2v/runtime'`
- Raw `.sv` testbench files — write TypeScript specs

---

## Examples Must Stay Compilable

Every example in `examples/` MUST compile successfully at all times. If a compiler change
breaks an existing example, the compiler change MUST include a fix for the example or a
documented reason the example is now deprecated.

`bun run compile:example` is the canonical sanity-check command.
