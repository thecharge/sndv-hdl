# Scenarios — Testbench Authoring

Acceptance scenarios for the UVM-style verification flow.

---

## SCENARIO: CombTestSpec produces passing simulation

GIVEN a `CombTestSpec` for the adder module:
```typescript
const spec: CombTestSpec = {
    kind: 'combinational',
    module: 'add',
    sourceFile: 'examples/adder/adder.ts',
    ports: {
        inputs: [{ name: 'a', width: 32 }, { name: 'b', width: 32 }],
        outputs: [{ name: 'result', width: 32 }]
    },
    vectors: [
        { label: 'zero plus zero', inputs: { a: "32'd0", b: "32'd0" }, expected: { result: "32'd0" } },
        { label: 'add 1+1', inputs: { a: "32'd1", b: "32'd1" }, expected: { result: "32'd2" } },
    ]
};
```

WHEN `bun run test:uvm` is executed

THEN `iverilog` SHALL compile the generated testbench without errors
AND both test vectors SHALL pass
AND the JSON report SHALL show `"passed": 2, "failed": 0`
AND `bun run test:uvm` SHALL exit with code 0

ACCEPTANCE: `.artifacts/uvm/reports/uvm-alu-report.json` exists and shows all pass.

---

## SCENARIO: Failing test vector causes non-zero exit

GIVEN a `CombTestSpec` with an intentionally wrong expected value:
```typescript
{ label: 'wrong expectation', inputs: { a: "32'd1", b: "32'd1" }, expected: { result: "32'd99" } }
```

WHEN `bun run test:uvm` runs

THEN the simulation SHALL detect the mismatch
AND the JSON report SHALL show `"failed": 1` for this vector
AND `bun run test:uvm` SHALL exit with non-zero code

ACCEPTANCE: CI correctly catches regressions via non-zero exit status.

---

## SCENARIO: Raw .sv testbench file is rejected

GIVEN a file `testbenches/my_module_tb.sv` hand-written in SystemVerilog

WHEN a code review or linter scan runs

THEN the scan SHALL flag the file as a policy violation
AND the author SHALL be directed to write a TypeScript spec instead

ACCEPTANCE: AGENTS.md and spec constraints clearly state this rule; reviewer enforces it.

---

## SCENARIO: New suite added by following uvm-suite-authoring.md

GIVEN a new hardware example `examples/hardware/tang_nano_20k/knight_rider/` is added

WHEN a QA engineer follows `docs/guides/uvm-suite-authoring.md` to add a suite

THEN a new `testbenches/knight_rider.tb-spec.ts` SHALL be created
AND a new generator entry SHALL be added
AND `bun run test:uvm` SHALL include the new suite in its run
AND `.artifacts/uvm/reports/uvm-knight_rider-report.json` SHALL be produced

ACCEPTANCE: `bun run test:uvm` output references the new suite.

---

## SCENARIO: SeqTestSpec blinker suite validates counter logic

GIVEN the blinker `SeqTestSpec` that forces `counter` to 0xFFFFFF (one below overflow)

WHEN the simulation runs one clock cycle

THEN `counter` SHALL increment to 0 (overflow)
AND `led` SHALL increment by 1 (counter-zero transition fires)

ACCEPTANCE: `.artifacts/uvm/reports/uvm-blinky-report.json` shows this check passing.
