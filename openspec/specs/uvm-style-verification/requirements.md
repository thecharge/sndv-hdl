# Requirements — uvm-style-verification

Keyed REQ-UVM-NNN.

---

## Testbench Source Policy

REQ-UVM-001: ALL testbench source SHALL be TypeScript. Raw `.sv` testbench files
SHALL NOT be written in `testbenches/` — they are generated build artifacts only.

REQ-UVM-002: TypeScript testbench specs SHALL implement `SeqTestSpec` or `CombTestSpec`
from `testbenches/tb-spec-types.ts`.

REQ-UVM-003: Generated `.sv` testbenches SHALL be placed in `.artifacts/` and SHALL NOT
be committed to the repository.

---

## Spec Types

REQ-UVM-010: `CombTestSpec` SHALL support test vectors with named input and output signals
expressed as SV literals (e.g., `"32'd42"`, `"1'b1"`).

REQ-UVM-011: `SeqTestSpec` SHALL support forced signal states and expected register/output
values for sequential behavioral checking.

REQ-UVM-012: Both spec types SHALL include a `module` field naming the SV module under test,
and a `sourceFile` field pointing to the TypeScript source.

REQ-UVM-013: `SeqTestSpec` SHALL include clock signal name, reset signal name (optional),
and clock half-period in nanoseconds.

---

## Simulation Flow

REQ-UVM-020: The `bun run test:uvm` command SHALL:
1. Compile the design under test to SV
2. Generate the SV testbench from the TypeScript spec
3. Run `iverilog` + `vvp` inside the container
4. Produce JSON and Markdown reports per suite

REQ-UVM-021: The simulation runner SHALL exit with code 0 only when all suites pass.
Any failing test vector SHALL cause non-zero exit.

REQ-UVM-022: Reports SHALL be written to `.artifacts/uvm/reports/<suite>-report.json`
and `.artifacts/uvm/reports/<suite>-report.md`.

REQ-UVM-023: The JSON report SHALL include: suite name, number of tests, number passed,
number failed, and per-test details (label, inputs applied, expected, actual, pass/fail).

---

## Adding New Suites

REQ-UVM-030: New verification suites SHALL be added by following the guide at
`docs/guides/uvm-suite-authoring.md`. This guide SHALL be updated whenever the
convention for adding suites evolves.

REQ-UVM-031: At least one simulation suite SHALL correspond to a real-board acceptance
behavior (e.g., blinker simulation validates the same counter logic that runs on hardware).
