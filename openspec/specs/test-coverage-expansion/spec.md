# test-coverage-expansion Specification

## Purpose
TBD - created by archiving change platform-expansion-v1. Update Purpose after archive.
## Requirements
### Requirement: Compiler pass unit tests
Every new compiler pass (clock-domain analysis, CDC detection, ergonomics desugaring) SHALL have a dedicated unit test file under `packages/core/src/__tests__/` with at least three test cases covering the happy path, an error path, and a boundary condition.

#### Scenario: Clock domain analysis pass has unit tests
- **WHEN** `bun test packages/core/src/__tests__/clock-domain-analysis.test.ts` is run
- **THEN** all tests pass and cover at least: single-domain registration, cross-domain warning emission, and duplicate domain error

#### Scenario: CDC detection pass has unit tests
- **WHEN** `bun test packages/core/src/__tests__/cdc-detection.test.ts` is run
- **THEN** all tests pass covering: unguarded crossing warning, two-FF crossing acceptance, AsyncFifo crossing acceptance

### Requirement: UVM testbench specs for all stdlib modules
Every stdlib protocol module SHALL have a corresponding UVM-style testbench spec under `testbenches/` as a TypeScript `SeqTestSpec` or `CombTestSpec` file.

#### Scenario: SPI controller testbench exists and passes
- **WHEN** `bun run test:uvm` is executed
- **THEN** the SPI controller testbench runs and all scenarios pass

#### Scenario: UART TX testbench exists and passes
- **WHEN** `bun run test:uvm` is executed
- **THEN** the UART TX testbench runs and produces correct bit sequence for test vector 0x55

### Requirement: Coverage report generation
The test pipeline SHALL generate an Istanbul/c8 coverage report after `bun test` runs and store it under `.artifacts/coverage/`.

#### Scenario: Coverage report generated after test run
- **WHEN** `bun run test:coverage` is executed
- **THEN** `.artifacts/coverage/lcov.info` is produced with line and branch coverage data

### Requirement: Coverage threshold CI gate
The CI pipeline SHALL fail if any package under `packages/` falls below 80% line coverage as reported by the coverage tool.

#### Scenario: Coverage below threshold fails quality gate
- **WHEN** `bun run quality` is executed and `packages/core` line coverage is below 80%
- **THEN** the command exits non-zero with a message indicating which package failed the coverage threshold

#### Scenario: Coverage at or above threshold passes
- **WHEN** `bun run quality` is executed and all packages meet 80% line coverage
- **THEN** the coverage check exits 0

### Requirement: UVM testbench infrastructure supports coverage reporting
The `bun run test:coverage` script SHALL invoke coverage tooling after the test suite completes and report line, function, and statement coverage to stdout and `.artifacts/coverage/`.

#### Scenario: Coverage report generated after test run
- **WHEN** `bun run test:coverage` is executed
- **THEN** coverage output is produced (or a warning is emitted if V8 coverage data is unavailable in the current runtime)

