# Requirements — board-configuration-and-support

Requirements for board definitions, constraint generation, and workspace config.
Keyed REQ-BOARD-NNN.

---

## Board Definition Format

REQ-BOARD-001: Every board SHALL be defined as a JSON file in `boards/` following the
established schema with fields for pin assignments, clock frequency, programmer profiles,
and vendor-specific synthesis flags.

REQ-BOARD-002: Board definitions SHALL include a complete pin map with signal names,
pin numbers, I/O standards (`std`), drive strength (`drive`), and pull configuration
(`pull`) for all signals.

REQ-BOARD-003: Board definitions SHALL specify the clock frequency used by the compiler
for timing constant derivation (e.g., baud rate, WS2812 timing).

REQ-BOARD-004: Board definitions SHALL specify the target FPGA part number and family
to select the correct synthesis and PnR tools.

---

## Constraint Generation

REQ-BOARD-010: The constraint generator SHALL produce a `.cst` (Gowin) or `.xdc` (Xilinx)
file from any board definition that has a pin map.

REQ-BOARD-011: For Gowin boards, generated `.cst` files SHALL use `IO_LOC` and `IO_PORT`
directives matching the board's signal names and pin assignments.

REQ-BOARD-012: Constraint files SHALL include all signal-to-pin mappings needed for the
referenced hardware example to function correctly on that board.

REQ-BOARD-013: The constraint generator SHALL NOT require Vivado or any closed-source
tool to generate constraints for any supported board.

---

## Board Admission Policy (from AGENTS.md)

REQ-BOARD-020: A board MAY only appear in `configs/workspace.config.json` and
`packages/types/SupportedBoardId` when its complete OSS path is verified end-to-end.
Verification requires: Yosys synthesis, nextpnr PnR, bitstream pack, and
openFPGALoader flash — all confirmed working and logged.

REQ-BOARD-021: A board that has only constraint generation support (like Arty A7) SHALL
NOT be added to `SupportedBoardId` as a synthesis-capable board.

REQ-BOARD-022: The first confirmed flash for any new board SHALL be logged in
`docs/append-only-engineering-log.md` with the exact command and output.

---

## Programmer Profiles

REQ-BOARD-030: Each board SHALL have at least one programmer profile in
`configs/workspace.config.json` with cable type, VID, and PID if autodetect is unreliable.

REQ-BOARD-031: Multiple programmer profiles SHALL be tried in order (autodetect first,
then explicit profiles) to accommodate different USB probe hardware.

---

## Board Registry and CLI Wiring

REQ-BOARD-050: The CLI SHALL parse the `id` field from the board JSON and map it to a `SupportedBoardId`. The resolved ID SHALL be stored in `CompileRequest.resolvedBoardId` for use by the toolchain phase.

REQ-BOARD-051: The CLI SHALL emit a clear error diagnostic naming the unrecognised board id and exit with a non-zero code when the board `id` does not match any registered `SupportedBoardId`.

---

## Multi-Board Extensibility

REQ-BOARD-040: The board definition format SHALL be extensible to new FPGA families
without breaking existing board definitions.

REQ-BOARD-041: Adding a new board SHALL require only: a new JSON file in `boards/`,
a new programmer profile entry, an update to `SupportedBoardId`, and a confirmed flash log.
No changes to the core compiler SHALL be required for new board support (pin mapping only).
