# UVM-Style Suite Authoring Guide

This guide defines how to add future local/container verification suites without GitHub CI coupling.

## Lifecycle Placement
Use UVM-style suites after TypeScript compile and before board flash.

This workflow is intentionally local/container-first. Do not require GitHub CI for suite execution.

Recommended order:
1. `bun run test:root`
2. `bun run test:uvm`
3. hardware flash/board validation

## Required Pieces Per Suite
For each new suite add:
- Typed suite spec in `testbenches/uvm/*.uvm-spec.ts`
- Generator in `packages/core/src/compiler/verification/*generator.ts`
- Entrypoint script in `scripts/generate-uvm-*-testbench.ts`
- Simulation command block in `scripts/run-uvm-testbench.sh`
- Unit assertions in `tests/uvm-flow.test.ts`

## Report Requirements
Each suite should emit:
- `.artifacts/uvm/reports/uvm-<suite>-report.json`
- `.artifacts/uvm/reports/uvm-<suite>-report.md`

The JSON report should be machine-friendly for release evidence and regression trend tools.

## Blinky Example Pattern
For `examples/hardware/tang_nano_20k_blinker.ts`:
- verify deterministic phase-to-LED mapping,
- verify active-low outputs,
- use cycle forcing in simulation (`counter`, `phase`) to avoid long waits for natural wrap.

## Production Notes
- UVM-style simulation proves logic intent, not physical bring-up.
- Keep real-board flash as acceptance gate for pin mapping, voltage, probe access, and persistence.

## Production-Grade Checklist
For a suite to be treated as production-grade, target all items below:
- deterministic pass/fail behavior with fixed seeds or deterministic vectors,
- machine-readable report artifacts (`json`, `md`) generated on every run,
- non-zero process exit on verification failure,
- at least one negative-path check (expected failure or protocol violation),
- cross-check against at least one real-board behavior expectation,
- append-only log entry documenting command evidence and outcomes.
