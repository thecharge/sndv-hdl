# Production Readiness

This document defines what "production-ready" means for this repository.

## Definition
Production-ready means:
- compiler and toolchain pass quality gates,
- board programming flow is reproducible,
- behavior is validated on real hardware,
- runbooks exist for common failure modes.

## Readiness Gates
1. `bun run quality` passes.
2. compile command generates all expected artifacts.
3. flash command uses persistent external write + verify.
4. power-cycle behavior is confirmed for validated examples.
5. docs/runbooks are up to date and operational.

## Compiler Policy
- No hard cap on source line count.
- No hard cap on bit width (`Logic<N>`, `UintN`, `UIntN` use positive integer widths).
- No hard cap on explicit array size (positive integer required).
- Real upper bounds are tool capacity, timing closure, and target silicon resources.

## Toolchain Policy
- Required pipeline: Yosys -> nextpnr-himbaechel -> gowin_pack -> openFPGALoader.
- Programming mode for Tang Nano 20K must be explicit external flash write + verify.

## Hardware Validation Policy
- Do not claim production if only simulation passed.
- Do not claim persistence if power-cycle was not tested.
- Keep append-only command evidence in `docs/append-only-engineering-log.md`.

## Required Operations Documentation
- quickstart from zero,
- board definition authoring,
- programming runbook,
- troubleshooting runbook,
- external resource links.
