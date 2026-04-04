# Requirements — example-hardware-designs

Keyed REQ-EXAM-NNN.

---

## Layout and Structure

REQ-EXAM-001: Hardware examples SHALL live under `examples/hardware/<board>/<name>/`.
No hardware example SHALL be placed at `examples/*.ts` or `examples/<name>.ts` (flat layout).

REQ-EXAM-002: Each hardware example SHALL have its own subfolder containing only
TypeScript hardware source files. No client scripts (Bun/Node API imports) SHALL be
co-located in the same directory as hardware source.

REQ-EXAM-003: Examples with both hardware (FPGA) and a PC client SHALL split into:
- `hw/` — TypeScript hardware source files (compile this directory)
- `client/` — Bun/Node scripts for the PC side (never compiled as hardware)

REQ-EXAM-004: Simulation examples SHALL live under `examples/<name>/` (not under `hardware/`).

---

## Source Quality

REQ-EXAM-010: Every hardware example SHALL:
- Import only from `'@ts2v/runtime'` (not `'ts2sv'`)
- Use `const` for all module-level named values (no magic numbers in logic)
- Use `@ModuleConfig('resetSignal: "no_rst"')` when `btn` or `rst_n` are used as plain
  inputs rather than hardware resets
- Name all timing constants at the top of the file (e.g., `const BIT_PERIOD = 234`)

REQ-EXAM-011: Hardware examples SHALL NOT use:
- Ternary operator `?:`
- `let` or `var` at module level
- `wire` in any generated or hand-written SystemVerilog
- `'ts2sv'` import alias

REQ-EXAM-012: FSMs in examples SHALL use `enum` for state encoding and `switch/case` for
state transitions.

---

## Compilation

REQ-EXAM-020: Every hardware example SHALL compile without errors via:
```bash
bun run apps/cli/src/index.ts compile <path> --board <board.json> --out <dir>
```

REQ-EXAM-021: Multi-file examples SHALL be compiled by passing the directory (or `hw/`
subdirectory), not a single `.ts` file.

---

## Documentation

REQ-EXAM-030: Every new hardware example SHALL be added to `README.md` under the examples
section with a brief description.

REQ-EXAM-031: Every new hardware example SHALL have an entry appended to
`docs/append-only-engineering-log.md` describing: purpose, compile command, flash command,
observed behavior.

REQ-EXAM-032: Examples with non-obvious hardware behavior (WS2812, UART, button polarity)
SHALL have an inline README or reference to the relevant guide in `docs/guides/`.

---

## Hardware Verification

REQ-EXAM-040: Production-status examples SHALL have at least one confirmed real-board flash
logged with the exact openFPGALoader output.

REQ-EXAM-041: Hardware examples that use WS2812 SHALL document: GRB byte order, reset pulse
duration, and the chip variant requirement (WS2812C-2020 on Tang Nano 20K needs > 280 µs).

REQ-EXAM-042: UART examples SHALL document: baud rate, TX/RX pin assignments, JTAG vs UART
port distinction (`/dev/ttyUSB0` = JTAG, `/dev/ttyUSB1` = data when Tang Nano is only device).
