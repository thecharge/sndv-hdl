# QA and Testing

## Unit Tests
- Test runner: `bun test`
- Root class-compiler regression tests: `bun run test:root`
- Current package tests:
  - CLI parser tests
  - Config service tests
  - Core compilation facade tests
  - Toolchain command factory tests

## Containerized HDL Simulation
- UVM-style smoke flow (ALU): `bun run test:uvm`
- This path compiles and simulates both:
  - `examples/alu.ts`
  - `examples/hardware/tang_nano_20k_blinker.ts`
- It runs `iverilog`/`vvp` from the project toolchain image.
- Report artifacts are written to:
  - `.artifacts/uvm/reports/uvm-alu-report.json`
  - `.artifacts/uvm/reports/uvm-alu-report.md`
  - `.artifacts/uvm/reports/uvm-blinky-report.json`
  - `.artifacts/uvm/reports/uvm-blinky-report.md`

## Future Suite Authoring
- Follow `docs/guides/uvm-suite-authoring.md` for adding new UVM-style suites.

## Production-Grade Verification Criteria
- UVM suite outputs must include per-suite JSON and Markdown reports.
- Verification runners must fail with non-zero exit code when any suite fails.
- At least one simulation suite should be mapped to a corresponding real-board acceptance behavior.

## Quality Gates
```bash
bun run quality
```
This executes:
- Typecheck
- Lint
- Package tests
- Root tests
- Build

## Regression Strategy
- Keep source-level unit tests for all command/facade/repository boundaries.
- Add board-specific integration tests as toolchain availability increases.
- Capture failures and remediation in append-only engineering log.
