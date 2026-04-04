# Tasks: bootstrap-open-spec

**Status:** Complete

All tasks were completed during the initial OpenSpec bootstrap session.

---

## Task List

### TASK-001: Create openspec/config.yaml with full project context
**Owner:** Documentation Agent
**Status:** Complete
**Validation:** File exists at `openspec/config.yaml` with context, rules, and per-artifact rules.

---

### TASK-002: Create openspec/AGENTS.md
**Owner:** Documentation Agent
**Status:** Complete
**Validation:** File exists with capability index, non-negotiable rules, proposal guidance,
and known limitations table.

---

### TASK-003: Create ts-to-sv-compiler-core spec
**Owner:** Compiler Agent
**Status:** Complete
**Files:**
- `openspec/specs/ts-to-sv-compiler-core/index.md`
- `openspec/specs/ts-to-sv-compiler-core/requirements.md` (REQ-COMP-001 through REQ-COMP-055)
- `openspec/specs/ts-to-sv-compiler-core/constraints.md`
- `openspec/specs/ts-to-sv-compiler-core/scenarios/functional-compiler.md`
- `openspec/specs/ts-to-sv-compiler-core/scenarios/class-compiler.md`

**Validation:** `bun run quality` passes; content matches `docs/specification.md`.

---

### TASK-004: Create hardware-decorators-and-runtime spec
**Owner:** Compiler Agent + Build Agent
**Status:** Complete
**Files:**
- `openspec/specs/hardware-decorators-and-runtime/index.md`
- `openspec/specs/hardware-decorators-and-runtime/requirements.md` (REQ-DECR-001 through REQ-DECR-032)
- `openspec/specs/hardware-decorators-and-runtime/constraints.md`
- `openspec/specs/hardware-decorators-and-runtime/scenarios/decorator-usage.md`

**Validation:** Content matches `packages/runtime/src/decorators.ts` and `packages/runtime/src/types.ts`.

---

### TASK-005: Create open-source-toolchain-integration spec
**Owner:** Toolchain Agent
**Status:** Complete
**Files:**
- `openspec/specs/open-source-toolchain-integration/index.md`
- `openspec/specs/open-source-toolchain-integration/requirements.md` (REQ-TOOL-001 through REQ-TOOL-052)
- `openspec/specs/open-source-toolchain-integration/constraints.md`
- `openspec/specs/open-source-toolchain-integration/scenarios/synthesis-and-flash.md`

**Validation:** Content matches `docs/hardware-toolchain.md` and `docs/compliance.md`.

---

### TASK-006: Create board-configuration-and-support spec
**Owner:** Toolchain Agent + Build Agent
**Status:** Complete
**Files:**
- `openspec/specs/board-configuration-and-support/index.md`
- `openspec/specs/board-configuration-and-support/requirements.md` (REQ-BOARD-001 through REQ-BOARD-041)
- `openspec/specs/board-configuration-and-support/constraints.md`
- `openspec/specs/board-configuration-and-support/scenarios/board-definition.md`

**Validation:** Board admission criteria match AGENTS.md; Tang Nano 20K pin reference matches `CLAUDE.md`.

---

### TASK-007: Create example-hardware-designs spec
**Owner:** All Agents
**Status:** Complete
**Files:**
- `openspec/specs/example-hardware-designs/index.md`
- `openspec/specs/example-hardware-designs/requirements.md` (REQ-EXAM-001 through REQ-EXAM-042)
- `openspec/specs/example-hardware-designs/constraints.md`
- `openspec/specs/example-hardware-designs/scenarios/hardware-examples.md`

**Validation:** Examples matrix matches `docs/guides/examples-matrix.md` and `README.md`.

---

### TASK-008: Create uvm-style-verification spec
**Owner:** QA Agent
**Status:** Complete
**Files:**
- `openspec/specs/uvm-style-verification/index.md`
- `openspec/specs/uvm-style-verification/requirements.md` (REQ-UVM-001 through REQ-UVM-031)
- `openspec/specs/uvm-style-verification/constraints.md`
- `openspec/specs/uvm-style-verification/scenarios/testbench-authoring.md`

**Validation:** Spec type requirements match `testbenches/tb-spec-types.ts`.

---

### TASK-009: Create cli-and-workflow-orchestration spec
**Owner:** Build Agent
**Status:** Complete
**Files:**
- `openspec/specs/cli-and-workflow-orchestration/index.md`
- `openspec/specs/cli-and-workflow-orchestration/requirements.md` (REQ-CLI-001 through REQ-CLI-031)
- `openspec/specs/cli-and-workflow-orchestration/constraints.md`
- `openspec/specs/cli-and-workflow-orchestration/scenarios/compile-and-flash.md`

**Validation:** Canonical CLI invocation matches `CLAUDE.md` and `README.md`.

---

### TASK-010: Create documentation-and-compliance spec
**Owner:** Documentation Agent
**Status:** Complete
**Files:**
- `openspec/specs/documentation-and-compliance/index.md`
- `openspec/specs/documentation-and-compliance/requirements.md` (REQ-DOCS-001 through REQ-DOCS-043)
- `openspec/specs/documentation-and-compliance/constraints.md`

**Validation:** Typography rules match AGENTS.md forbidden patterns.

---

### TASK-011: Create cpu-and-soc-extensions spec
**Owner:** Compiler Agent + Toolchain Agent
**Status:** Complete
**Files:**
- `openspec/specs/cpu-and-soc-extensions/index.md`
- `openspec/specs/cpu-and-soc-extensions/requirements.md` (REQ-CPU-001 through REQ-CPU-031)
- `openspec/specs/cpu-and-soc-extensions/constraints.md`

**Validation:** Limitations table matches CLAUDE.md "Known Compiler Limitations" section.

---

### TASK-012: Create bootstrap-open-spec change proposal
**Owner:** Documentation Agent
**Status:** Complete
**Files:**
- `openspec/changes/bootstrap-open-spec/proposal.md`
- `openspec/changes/bootstrap-open-spec/design.md`
- `openspec/changes/bootstrap-open-spec/tasks.md` (this file)

**Validation:** All spec directories and files exist; `bun run quality` passes.

---

## Post-Bootstrap Next Steps

The following proposals are ready to be created using `/opsx:propose`:

1. `add-logicarray-indexed-access` — address the most impactful compiler limitation
2. `add-tang-nano-9k-full-flash-verification` — promote Tang Nano 9K to confirmed-flash status
3. `add-parameterised-modules` — `parameter` declarations in generated SV
4. `add-bit-slice-intrinsics` — `Bits.slice(signal, hi, lo)` for cleaner bit extraction
5. `add-xilinx-arty-a7-full-support` — enable when OSS Xilinx 7-series synthesis is viable
