# Requirements — cli-and-workflow-orchestration

Keyed REQ-CLI-NNN.

---

## Invocation

REQ-CLI-001: The CLI SHALL be invoked via `bun run apps/cli/src/index.ts` — never as a
globally-installed binary named `ts2v`. Documentation MUST NOT reference `ts2v compile ...`.

REQ-CLI-002: The `compile` command SHALL accept a source path (file or directory) as a
positional argument.

REQ-CLI-003: The `compile` command SHALL accept `--board <path>` to specify the board
definition JSON.

REQ-CLI-004: The `compile` command SHALL accept `--out <dir>` to specify the output directory
for generated artifacts (.sv, .cst, .fs).

REQ-CLI-005: The `compile` command SHALL accept `--flash` to trigger synthesis and flash
after successful compilation.

---

## Compilation Behavior

REQ-CLI-010: When given a directory path, the CLI SHALL pass the directory to the compiler
for multi-file compilation (not iterate and compile files individually).

REQ-CLI-011: When given a file path ending in `.ts`, the CLI SHALL compile the single file.

REQ-CLI-012: The CLI SHALL exit with code 0 on success and non-zero on any compilation,
synthesis, or flash error.

REQ-CLI-013: Error messages SHALL include source location (file, line, column) for
compiler errors, and stage identification (synthesis, PnR, flash) for toolchain errors.

---

## Flash Behavior

REQ-CLI-020: When `--flash` is specified, the CLI SHALL run the full synthesis pipeline
before attempting to flash.

REQ-CLI-021: The CLI SHALL display openFPGALoader progress output to the user including
the Writing and Verifying lines.

REQ-CLI-022: After flash completes, the CLI SHALL display a reminder to power-cycle the
board (required for GW2AR-18C to reload from external flash).

---

## Quality

REQ-CLI-030: `bun run quality` SHALL include CLI package typecheck and lint.
REQ-CLI-031: CLI command handlers SHALL have unit tests covering argument parsing.
