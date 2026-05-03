# nimble-processor-example Specification

## Purpose
TBD - created by archiving change platform-expansion-v1. Update Purpose after archive.
## Requirements
### Requirement: nibble4 CPU source lives under examples/cpu/nibble4/
The nibble4 multi-core 4-bit CPU TypeScript source SHALL be located at `examples/cpu/nibble4/` (directory-based compile target). Imports MUST use `'@ts2v/runtime'`. The `cpu/ts/` directory SHALL be retired (source moved, not duplicated).

#### Scenario: nibble4 directory compiles with ts2v
- **WHEN** `bun run apps/cli/src/index.ts compile examples/cpu/nibble4 --board boards/tang_nano_20k.board.json --out .artifacts/nibble4`
- **THEN** the command exits 0 and `.artifacts/nibble4/` contains valid IEEE 1800-2017 SV output

#### Scenario: nibble4 imports use @ts2v/runtime
- **WHEN** any file under `examples/cpu/nibble4/` is inspected
- **THEN** no import uses the `'ts2sv'` alias; all hardware imports use `'@ts2v/runtime'`

### Requirement: nibble4 synthesises and flashes on Tang Nano 20K
The nibble4 SoC design SHALL synthesise via Yosys + nextpnr-himbaechel + gowin_pack and flash to Tang Nano 20K using openFPGALoader. The flash result SHALL be logged.

#### Scenario: nibble4 flash succeeds
- **WHEN** `bun run apps/cli/src/index.ts compile examples/cpu/nibble4 --board boards/tang_nano_20k.board.json --out .artifacts/nibble4 --flash` is run
- **THEN** openFPGALoader exits 0, the flash write+verify output is printed, and the result is appended to `docs/append-only-engineering-log.md`

### Requirement: nibble4 has a UVM testbench spec
A TypeScript UVM-style testbench spec SHALL exist at `testbenches/nibble4-cpu.tb-spec.ts` covering at least: reset behavior, ADD instruction execution, and JUMP instruction execution.

#### Scenario: nibble4 UVM testbench passes
- **WHEN** `bun run test:uvm` is executed
- **THEN** the nibble4-cpu testbench runs and all three scenarios (reset, ADD, JUMP) produce PASS

### Requirement: nibble4 example listed in README
The nibble4 example SHALL be listed in the README.md examples section and referenced in `docs/guides/examples-matrix.md` with a one-line description and the compile command.

#### Scenario: README references nibble4 example
- **WHEN** README.md is read
- **THEN** it contains a reference to `examples/cpu/nibble4/` with a description of the nibble4 CPU

### Requirement: nibble4 formal property verified
At least one formal property on the nibble4 core (e.g., reset clears the program counter) SHALL be expressed via `@Assert` and verified with `bun run verify`.

#### Scenario: nibble4 reset property verifies
- **WHEN** `bun run verify .artifacts/nibble4/nibble4.sby` is run
- **THEN** the reset-clears-PC assertion passes within the default bounded model checking depth

