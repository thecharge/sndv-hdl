# Requirements — cpu-and-soc-extensions

Keyed REQ-CPU-NNN.

---

## Source Location and Import

REQ-CPU-001: All CPU and SoC TypeScript sources SHALL live under `examples/cpu/`.
REQ-CPU-002: CPU and SoC sources SHALL import from `'@ts2v/runtime'`, not `'ts2sv'`.
REQ-CPU-003: CPU and SoC designs SHALL be compiled as directories (not single files).

---

## Design Standards

REQ-CPU-010: CPU module FSM state enums SHALL have globally unique member names across
all enums in the design (e.g., prefix by FSM name: `FETCH_IDLE`, `DECODE_IDLE`).

REQ-CPU-011: Register file patterns (workaround for LogicArray limitation) SHALL use
explicit named registers (`reg0`, `reg1`, ..., `regN`) with `if/else` chains for indexed
access. The number of explicit registers SHALL be documented in the module.

REQ-CPU-012: CPU modules with more than 3 FSMs SHALL include an architecture diagram
in `cpu/README_ASSEMBLY.md` using Mermaid.

---

## Expansion Path

REQ-CPU-020: Any proposal to add CPU functionality MUST identify which known compiler
limitation (if any) it depends on being resolved first.

REQ-CPU-021: If a new CPU design requires a compiler feature that does not yet exist
(e.g., LogicArray indexed access), the proposal SHALL either:
a) Include the compiler feature implementation as a prerequisite task, OR
b) Use an approved workaround and document it clearly in the design.

---

## Verification

REQ-CPU-030: Complex CPU designs SHALL have at least one `SeqTestSpec` testbench spec
in `testbenches/` that validates the fetch-decode-execute cycle for at least one
instruction.

REQ-CPU-031: CPU examples targeting Tang Nano 20K SHALL be compiled and synthesized
successfully via `bun run compile:example` (or equivalent command).
