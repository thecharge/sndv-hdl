# Scenarios — Hardware Examples

Acceptance scenarios for hardware example quality and compilation.

---

## SCENARIO: New hardware example compiles without errors

GIVEN a new hardware example at `examples/hardware/tang_nano_20k/<name>/<name>.ts`
following all source quality rules

WHEN compiled:
```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/<name>/<name>.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/<name>
```

THEN the command SHALL exit with code 0
AND `.artifacts/<name>/<name>.sv` SHALL exist
AND `.artifacts/<name>/<name>.cst` SHALL exist
AND no TypeScript errors SHALL appear in the compiler output

ACCEPTANCE: `bun run compile:example` succeeds for the new example.

---

## SCENARIO: Multi-file example compiled as directory

GIVEN a multi-file example at `examples/hardware/tang_nano_20k/ws2812_demo/` containing
multiple `.ts` files

WHEN compiled by passing the directory:
```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/ws2812_demo \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/ws2812_demo
```

THEN a single `.sv` file SHALL be produced containing all modules
AND no import/export TypeScript lines SHALL appear in the .sv

ACCEPTANCE: Output .sv has all modules (WS2812 serialiser + demo controller).

---

## SCENARIO: aurora_uart hw/client split compiles correctly

GIVEN `examples/hardware/tang_nano_20k/aurora_uart/` with `hw/` and `client/` subdirs

WHEN compiled by passing the `hw/` subdirectory:
```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/aurora_uart/hw \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/aurora_uart
```

THEN only the hardware source is compiled (no Node API imports cause errors)
AND the output .sv is a valid hardware design

AND when the `client/` is accidentally passed instead:
THEN the compiler SHALL fail with an error about unsupported Node API constructs

ACCEPTANCE: First case succeeds; second fails with clear error.

---

## SCENARIO: calc_uart responds correctly to JSON commands

GIVEN the `calc_uart` example flashed to Tang Nano 20K

WHEN a Python serial client sends `{op: "add", a: 42, b: 13}`:
```python
s.write(bytes([0, 42, 13]))  # opcode 0 = add
r = s.read(2)                # result: 55
```

THEN the FPGA SHALL respond with the 2-byte big-endian result `55`
AND the response time SHALL be under 100 ms (hardware computation latency)

ACCEPTANCE: Python test script confirms `(r[0]<<8|r[1]) == 55`.

---

## SCENARIO: blinker LEDs are active-LOW and initialize correctly

GIVEN the blinker example with `led: Logic<6> = 0x3F` flashed to Tang Nano 20K

WHEN the board powers up

THEN all 6 LEDs SHALL be OFF initially (0x3F = all-off for active-LOW hardware)
AND as counter overflows, LEDs SHALL light up one at a time in sequence

ACCEPTANCE: Observed on real hardware; 0x3F initial state is all LEDs dark.

---

## SCENARIO: breathe PWM example runs without synthesis errors

GIVEN the `examples/hardware/tang_nano_20k/breathe/` example (PWM submodule demo)

WHEN compiled and synthesized

THEN the `@Submodule` instantiation SHALL wire the PWM module to the LED output
AND Yosys SHALL produce a netlist with the correct PWM submodule hierarchy

ACCEPTANCE: `bun run compile:example` succeeds; synthesis produces .fs bitstream.
