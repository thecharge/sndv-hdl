# Proposal: bootstrap-open-spec

**Status:** Complete (bootstrap artifact)
**Type:** Infrastructure — OpenSpec bootstrap
**Owner:** All Agents
**Created:** 2026-04-04

---

## Summary

Establish the OpenSpec spec-driven change management system for the ts2v project.
Create the full capability spec tree under `openspec/specs/`, the agent instruction file
`openspec/AGENTS.md`, and a starter proposal demonstrating how future expansions work.

This bootstrap makes explicit all requirements, constraints, and acceptance scenarios that
were previously implicit in `docs/specification.md`, `docs/compliance.md`, `CLAUDE.md`,
and `AGENTS.md`. Future proposals build on this foundation.

---

## Motivation

ts2v has grown to a production-grade compiler and toolchain with complex, interlocking
rules about TypeScript subset compliance, OSS toolchain policy, board admission criteria,
testbench authorship, and documentation standards. These rules are currently scattered
across `AGENTS.md`, `CLAUDE.md`, `docs/compliance.md`, `docs/specification.md`, and
various guides.

OpenSpec centralizes these as versioned, machine-readable capability specs with explicit
SHALL requirements, hard constraints, and GIVEN-WHEN-THEN acceptance scenarios. This
enables agentic AI to:
- Understand the boundaries of any capability before proposing changes
- Verify proposals against existing constraints automatically
- Generate change proposals that reference the exact spec sections they affect

---

## Capabilities Established

| Capability | Directory | Primary Spec Owner |
|---|---|---|
| ts-to-sv-compiler-core | `openspec/specs/ts-to-sv-compiler-core/` | Compiler Agent |
| hardware-decorators-and-runtime | `openspec/specs/hardware-decorators-and-runtime/` | Compiler Agent |
| open-source-toolchain-integration | `openspec/specs/open-source-toolchain-integration/` | Toolchain Agent |
| board-configuration-and-support | `openspec/specs/board-configuration-and-support/` | Toolchain Agent |
| example-hardware-designs | `openspec/specs/example-hardware-designs/` | All Agents |
| uvm-style-verification | `openspec/specs/uvm-style-verification/` | QA Agent |
| cli-and-workflow-orchestration | `openspec/specs/cli-and-workflow-orchestration/` | Build Agent |
| documentation-and-compliance | `openspec/specs/documentation-and-compliance/` | Documentation Agent |
| cpu-and-soc-extensions | `openspec/specs/cpu-and-soc-extensions/` | Compiler + Toolchain |

---

## Non-Goals

- This proposal does NOT add any compiler features
- This proposal does NOT support any new FPGA boards
- This proposal does NOT require Vivado, Quartus, or any closed-source EDA tools
- This proposal does NOT change any existing TypeScript source, tests, or examples

---

## OSS Toolchain Impact

None. This is a documentation and spec-infrastructure change only.

---

## Validation Commands

```bash
# Verify all spec files are present
ls openspec/specs/
ls openspec/specs/ts-to-sv-compiler-core/
ls openspec/specs/hardware-decorators-and-runtime/

# Verify quality still passes (no source changed)
bun run quality

# Verify compile:example still works
bun run compile:example
```

---

## Known Residual Risks

1. The spec files are a snapshot of the project as of the bootstrap date. They will drift
   from reality if not maintained alongside code changes. The Documentation Agent must
   update relevant specs when any capability changes.

2. The OpenSpec `config.yaml` context section is hand-written and may need updating when
   new boards or language features are added.

3. The `cpu-and-soc-extensions` capability spec is marked "Experimental" because the
   CPU source is still in development and full compilation status has not been confirmed.

---

## How Future Expansions Work

The following examples show how agents use OpenSpec to propose new features:

### Example A: Add LogicArray indexed sequential access

```
/opsx:propose add-logicarray-indexed-access
```

Expected proposal artifacts:
- `proposal.md`: motivation, design sketch, affected spec (ts-to-sv-compiler-core REQ-COMP-*)
- `design.md`: TS pattern (`this.pixels[this.idx] = newColor`), expected SV output
  (`pixels[idx] <= newColor` or equivalent mux), impact on class-sequential-emitter.ts
- `tasks.md`: Compiler Agent tasks with validation command `bun run test:root`

### Example B: Add Tang Nano 9K to full synthesis flow

```
/opsx:propose add-tang-nano-9k-full-flash-verification
```

Expected proposal artifacts:
- `proposal.md`: links to board-configuration-and-support REQ-BOARD-020 gating criteria
- `design.md`: existing `boards/tang_nano_9k.board.json` review, programmer profile
- `tasks.md`: Toolchain Agent tasks - real-board flash test, log entry, update SupportedBoardId

### Example C: Add @InOut tristate port support

```
/opsx:propose add-inout-tristate-ports
```

Expected proposal artifacts:
- `proposal.md`: motivation (USB PD CC lines), affects hardware-decorators-and-runtime + ts-to-sv-compiler-core
- `design.md`: new `@InOut` decorator API, generated SV `inout logic` port pattern
- `tasks.md`: runtime package (Build Agent) + class compiler parser/emitter (Compiler Agent)
