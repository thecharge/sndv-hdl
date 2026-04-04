# OpenSpec AGENTS — ts2v Hardware Compiler Project

This file governs how all AI agents (Build, Compiler, Toolchain, QA, Documentation) interact
with the OpenSpec spec-driven workflow for the ts2v project.

## What OpenSpec Is Here

OpenSpec is the structured change management layer for ts2v. Every non-trivial feature,
new board, new language construct, or toolchain extension starts as an OpenSpec **change**
with a proposal, design, and task list. The `openspec/specs/` tree holds the canonical
capability requirements — the authoritative definition of what this system must do.

## Capability Index

| Capability | Directory | Owner Roles |
|---|---|---|
| ts-to-sv-compiler-core | `openspec/specs/ts-to-sv-compiler-core/` | Compiler Agent |
| hardware-decorators-and-runtime | `openspec/specs/hardware-decorators-and-runtime/` | Compiler Agent |
| open-source-toolchain-integration | `openspec/specs/open-source-toolchain-integration/` | Toolchain Agent |
| board-configuration-and-support | `openspec/specs/board-configuration-and-support/` | Toolchain Agent + Build Agent |
| example-hardware-designs | `openspec/specs/example-hardware-designs/` | All Agents |
| uvm-style-verification | `openspec/specs/uvm-style-verification/` | QA Agent |
| cli-and-workflow-orchestration | `openspec/specs/cli-and-workflow-orchestration/` | Build Agent |
| documentation-and-compliance | `openspec/specs/documentation-and-compliance/` | Documentation Agent |
| cpu-and-soc-extensions | `openspec/specs/cpu-and-soc-extensions/` | Compiler Agent + Toolchain Agent |

## Non-Negotiable Project Rules

Every agent working in this repo MUST enforce these rules in every proposal and implementation:

### 1. Open-Source-Only Toolchain (HARD REQUIREMENT)

The entire synthesis-to-flash pipeline must use exclusively open-source tools:
- Synthesis: Yosys with the appropriate `synth_*` plugin
- Place-and-route: nextpnr family (nextpnr-himbaechel for Gowin boards)
- Bitstream packing: `gowin_pack` (Gowin), future OSS equivalents for other families
- Programming: `openFPGALoader`

**Never** reference Vivado, Quartus, proprietary Gowin EDA pack bits, or any closed-source
EDA tool in any proposal, design, task, or generated artifact.

### 2. Board Support Policy

A board may only appear in `configs/workspace.config.json` and `packages/types/SupportedBoardId`
when its **complete** OSS path is verified:
- Synthesis (Yosys plugin confirmed working)
- Place-and-route (nextpnr variant confirmed working)
- Bitstream pack (confirmed working)
- Flash (openFPGALoader confirmed working, cable profile documented)
- At least one real-board flash logged in `docs/append-only-engineering-log.md`

**Currently fully supported:** Tang Nano 20K (GW2AR-18C), Tang Nano 9K (GW1NR-9C)
**Constraint-gen only (no synthesis):** Arty A7 (Xilinx XC7A35T)
**Out of scope:** DE10-Nano (Intel Cyclone V — no OSS synthesis path)

### 3. TypeScript Subset Compliance

Every hardware source file (.ts) written for this project must comply with the compiler's
supported subset. The following are **explicitly forbidden** in hardware source:

| Pattern | Reason |
|---|---|
| Ternary operator `?:` | Compiler does not handle it |
| `let`/`var` at module level | Use `const` only |
| Magic numbers in logic | Define named `const` at top of file |
| `'ts2sv'` import alias | Use `'@ts2v/runtime'` |
| `wire` in generated/hand-written SV | Use `logic` |
| `input wire logic` port style | Use `input logic` |
| Flat `examples/*.ts` files | Use subfolder layout |
| Raw `.sv` testbench files | Write TypeScript specs only |
| `LogicArray` indexed sequential access | Use explicit if/else chains (known limitation) |
| Enum members shared across enums | Prefix by enum name for global uniqueness |

### 4. IEEE 1800-2017 Compliance

All generated SystemVerilog must be strictly IEEE 1800-2017 compliant:
- `logic` (not `wire`) for all signals and ports
- `input logic` (not `input wire logic`) for input ports
- `always_ff @(posedge clk or negedge rst_n)` with non-blocking assignments (`<=`)
- `always_comb` with blocking assignments (`=`)
- `typedef enum logic [N:0]` for TypeScript enums
- `timescale` and `default_nettype none/wire` guards

### 5. Testbench Source Policy

All testbench source is TypeScript. The spec types live in `testbenches/tb-spec-types.ts`.
The flow is:
1. Write a `SeqTestSpec` or `CombTestSpec` in `testbenches/`
2. The generator produces `.sv` testbenches in `.artifacts/` (never committed)
3. Container simulation runs with `iverilog`/`vvp`

**Never** write a raw `.sv` testbench file in `testbenches/`.

### 6. File Layout Rules

| Content | Location |
|---|---|
| Hardware examples | `examples/hardware/<board>/<name>/` |
| Simulation examples | `examples/<name>/` |
| TypeScript testbench specs | `testbenches/*.tb-spec.ts` |
| Generated SV testbenches | `.artifacts/` (not committed) |
| Board definitions | `boards/<name>.board.json` |
| Compiler source | `packages/core/src/compiler/` |
| Runtime decorators/types | `packages/runtime/src/` |
| CPU/SoC TypeScript | `examples/cpu/` |

### 7. Delivery Gates

Every change must satisfy all applicable gates before closing:

| Gate | Command |
|---|---|
| Typecheck + lint + test + build | `bun run quality` |
| Compile sanity check | `bun run compile:example` |
| Verification flow | `bun run test:uvm` (for verification changes) |
| Hardware flash | `bun run apps/cli/src/index.ts compile <path> --board <board> --out <dir> --flash` |
| Post-flash validation | Power cycle + confirm behavior persists from external flash |

### 8. Handoff Contract

Every change that modifies code must include:
1. **Purpose summary** - what the change does and why
2. **Validation command list** - exact commands to verify correctness
3. **Known residual risks** - documented limitations or open questions

Toolchain changes must include at least one command log proving behavior.
Hardware examples must be added to `README.md` and `docs/append-only-engineering-log.md`.

## How to Propose an Expansion

### New Compiler Feature (e.g., LogicArray indexed access, parameterised modules)

1. Run `/opsx:propose add-<feature-name>` or describe the change in explore mode
2. The proposal MUST include:
   - Which compiler gap from CLAUDE.md it addresses
   - The new TypeScript pattern the user will write
   - The expected SystemVerilog output
   - Which spec in `openspec/specs/ts-to-sv-compiler-core/` it extends
   - Impact on existing tests (`bun run test:root` must still pass)
   - The Compiler Agent owns implementation

### New Board Support (e.g., iCE40-based board)

1. Run `/opsx:propose add-<board-name>-support`
2. The proposal MUST include:
   - Evidence the full OSS path exists (Yosys plugin, nextpnr variant, pack, openFPGALoader)
   - The board JSON definition schema
   - Programmer profile (cable, VID, PID)
   - A test example (at minimum a blinker) with expected flash output
   - Update to `openspec/specs/board-configuration-and-support/`
   - The Toolchain Agent owns implementation + flash verification

### New Hardware Example

1. No formal proposal needed for examples that use only existing language features
2. Read CLAUDE.md DX guidance sections first
3. Create under `examples/hardware/<board>/<name>/`
4. Write a TypeScript testbench spec in `testbenches/`
5. Add to `README.md` and `docs/append-only-engineering-log.md`

### New Decorator or Runtime Type

1. Run `/opsx:propose add-<decorator-name>-decorator`
2. The proposal MUST include:
   - The new TypeScript API surface (decorator signature, type)
   - The generated SV construct it maps to
   - Update to `openspec/specs/hardware-decorators-and-runtime/`
   - The Compiler Agent owns implementation; Build Agent owns runtime package

## OpenSpec Spec Authoring Rules

When writing or updating spec files:
- `index.md` - purpose, owner, status, one-paragraph summary
- `requirements.md` - SHALL statements (normative), keyed REQ-CAP-NNN
- `constraints.md` - non-functional rules, OSS policy, TypeScript subset rules
- `scenarios/` - GIVEN-WHEN-THEN with acceptance criteria as measurable assertions

Requirements use this format:
```
REQ-CAP-001: The system SHALL <observable behavior>.
```

Scenarios use this format:
```
SCENARIO: <title>
GIVEN <precondition>
WHEN <action>
THEN <observable outcome>
AND <additional assertion>
ACCEPTANCE: <measurable check>
```

## Known Compiler Limitations (Current as of Bootstrap)

These are documented gaps. Proposals to address them are welcome.
Each item has a workaround that must be documented in any proposal's non-goals section
if not being addressed.

| Gap | Workaround | Proposal Candidate |
|---|---|---|
| No LogicArray indexed sequential access | Explicit pixel0..pixelN + if/else chain | `add-logicarray-indexed-access` |
| No parameterised modules | Shared `_constants.ts` + manual edit | `add-parameterised-modules` |
| No `@InOut` / tristate I/O | Separate `@Input`/`@Output` + external mux | `add-inout-tristate` |
| No multi-clock domain CDC annotations | Manual synchroniser, documented crossing | `add-cdc-annotations` |
| No bit-slice intrinsics (`Bits.slice`) | Shift-and-mask workaround | `add-bit-slice-intrinsics` |
| No full SVA temporal operators | `@Assert` emits basic property only | `add-sva-temporal-operators` |
| Arty A7 no synthesis (needs xraydb) | Constraint-gen only until OSS Xilinx path | `add-xilinx-arty-a7-full-support` |
| Enum members must be globally unique | Prefix by enum name | N/A (by design) |
| Multiple `@Submodule` same class unverified | Rename ports in copies | `verify-multi-submodule-instances` |
