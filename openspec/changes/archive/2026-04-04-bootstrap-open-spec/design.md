# Design: bootstrap-open-spec

**Status:** Complete (bootstrap artifact)

---

## Architecture

The OpenSpec tree for ts2v follows the standard spec-driven layout:

```
openspec/
  config.yaml                   - Project context + per-artifact rules
  AGENTS.md                     - Agent instructions for this hardware project
  specs/
    <capability>/
      index.md                  - Overview, owner, status, file map
      requirements.md           - SHALL statements (REQ-CAP-NNN)
      constraints.md            - Non-functional rules, hard limits
      scenarios/                - GIVEN-WHEN-THEN acceptance scenarios
  changes/
    <change-name>/
      proposal.md               - What and why
      design.md                 - How (this file)
      tasks.md                  - Atomic work items
    archive/                    - Completed changes
```

---

## Capability Requirement Key Format

```
REQ-<CAP>-NNN: The system SHALL <observable behavior>.
```

| Capability | Key |
|---|---|
| ts-to-sv-compiler-core | REQ-COMP-NNN |
| hardware-decorators-and-runtime | REQ-DECR-NNN |
| open-source-toolchain-integration | REQ-TOOL-NNN |
| board-configuration-and-support | REQ-BOARD-NNN |
| example-hardware-designs | REQ-EXAM-NNN |
| uvm-style-verification | REQ-UVM-NNN |
| cli-and-workflow-orchestration | REQ-CLI-NNN |
| documentation-and-compliance | REQ-DOCS-NNN |
| cpu-and-soc-extensions | REQ-CPU-NNN |

---

## Spec-to-Code Mapping

The specs capture requirements that are already implemented in the codebase. They are
the retrospective formalization of what the system does. Future proposals extend both
the spec (new requirements) and the code (new implementation) in tandem.

| Spec File | Primary Source of Truth |
|---|---|
| ts-to-sv-compiler-core/requirements.md | `docs/specification.md` + `packages/core/` |
| ts-to-sv-compiler-core/constraints.md | `CLAUDE.md` Known Limitations + Forbidden Patterns |
| hardware-decorators-and-runtime/requirements.md | `packages/runtime/src/` |
| open-source-toolchain-integration/requirements.md | `docs/hardware-toolchain.md` |
| board-configuration-and-support/requirements.md | `docs/compliance.md` board table + AGENTS.md |
| uvm-style-verification/requirements.md | `docs/qa-testing.md` + `testbenches/tb-spec-types.ts` |
| documentation-and-compliance/requirements.md | `AGENTS.md` Documentation Rules section |

---

## Config.yaml Design

The `openspec/config.yaml` file was populated with:
1. Full project context (what ts2v is, monorepo layout, tech stack)
2. Critical rules (OSS-only, board admission, TS subset restrictions, IEEE compliance)
3. Agent roles from `AGENTS.md`
4. Delivery gates from `AGENTS.md`
5. Forbidden patterns from `AGENTS.md` and `CLAUDE.md`
6. Per-artifact rules (proposal must have Non-goals, design must have TS subset used, etc.)

This ensures that AI-generated proposals automatically comply with the project's rules.

---

## AGENTS.md Design

`openspec/AGENTS.md` supplements the root `AGENTS.md` with OpenSpec-specific guidance:
1. Capability index with owner roles
2. Non-negotiable project rules (OSS policy, board gating, TS subset, IEEE compliance)
3. Testbench source policy
4. File layout rules
5. Delivery gates table
6. Handoff contract
7. How to propose each type of expansion
8. OpenSpec spec authoring conventions
9. Known compiler limitations table with proposal candidate names
