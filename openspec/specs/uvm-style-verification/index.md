# uvm-style-verification

**Owner:** QA Agent
**Status:** Production (ALU, blinker), Active development
**Version:** Bootstrap 1.0

## Summary

The UVM-style verification capability allows hardware designers to write testbench
specifications entirely in TypeScript. The flow:

1. Write a `SeqTestSpec` or `CombTestSpec` in `testbenches/`
2. A generator script converts the TypeScript spec to a SystemVerilog testbench in `.artifacts/`
3. The container runs `iverilog` + `vvp` to simulate the generated SV
4. Per-suite JSON and Markdown reports are produced in `.artifacts/uvm/reports/`

The key insight: all testbench source is TypeScript. Generated `.sv` testbenches are
build artifacts and must never be committed or hand-written.

## Files

- `requirements.md` - Requirements for the verification system
- `constraints.md` - Rules for testbench authoring and simulation
- `scenarios/testbench-authoring.md` - Acceptance scenarios

## Key Source Locations

| Path | Responsibility |
|---|---|
| `testbenches/tb-spec-types.ts` | `SeqTestSpec`, `CombTestSpec`, `TbSpec` type definitions |
| `testbenches/*.tb-spec.ts` | TypeScript testbench specs (source of truth) |
| `scripts/generate-*.ts` | Generators that produce `.sv` testbenches from specs |
| `.artifacts/uvm/reports/` | JSON + Markdown simulation reports (gitignored) |
| `testbenches/uvm/` | Additional UVM-style suite specs |
| `docs/guides/uvm-suite-authoring.md` | Guide for adding new suites |

## Related Capabilities

- `ts-to-sv-compiler-core` - the design under test must compile successfully first
- `open-source-toolchain-integration` - simulation runs in the same container
- `example-hardware-designs` - each example should eventually have a testbench spec
