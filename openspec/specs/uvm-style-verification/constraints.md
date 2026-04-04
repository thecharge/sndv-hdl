# Constraints — uvm-style-verification

---

## No Raw SV Testbenches (Hard Rule)

SystemVerilog testbench files MUST NOT be hand-written in `testbenches/` or anywhere
in the source tree. This is non-negotiable.

Rationale: TypeScript-first testbenches are the entire point of this verification
philosophy. They allow hardware designers to write tests in a familiar language and
benefit from TypeScript type checking for test spec correctness.

---

## Spec Location Rule

All TypeScript testbench spec files MUST:
- Live in `testbenches/` (root level)
- Have the naming convention `<design>.tb-spec.ts`
- Implement `SeqTestSpec` or `CombTestSpec` from `testbenches/tb-spec-types.ts`

---

## SV Literal Format in Specs

Test vectors express values as SV literals in strings. Contributors must follow this format:
- N-bit value: `"N'bBITS"`, `"N'dDECIMAL"`, `"N'hHEX"`
- Example: `"32'd42"` (decimal 42 as 32-bit), `"1'b1"` (bit high), `"4'hF"` (nibble)

This format is passed directly to the generated `iverilog` testbench.

---

## Verification Scope

UVM-style simulation tests the RTL behavior of compiled designs — it does NOT:
- Test physical timing on hardware (that requires real-board testing)
- Replace hardware flash acceptance testing for production status
- Simulate multi-clock-domain behavior (single-clock assumed in generated testbenches)

Physical behavior on hardware is tested by flashing and observing, then logging results
in `docs/append-only-engineering-log.md`.

---

## Suite Evolution

When the workflow for adding verification suites changes, `docs/guides/uvm-suite-authoring.md`
MUST be updated as part of the same change. Workflow changes that leave stale documentation
are considered incomplete.
