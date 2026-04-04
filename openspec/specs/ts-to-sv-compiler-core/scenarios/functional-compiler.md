# Scenarios — Functional Compiler

Acceptance scenarios for the functional (function-based) compilation path.
All scenarios use GIVEN-WHEN-THEN format with measurable acceptance criteria.

---

## SCENARIO: Basic integer addition function

GIVEN a TypeScript source file containing:
```typescript
function add(a: number, b: number): number {
    return a + b;
}
```

WHEN the compiler processes this source

THEN the output SystemVerilog SHALL contain:
```systemverilog
module add(
    input logic [31:0] a,
    input logic [31:0] b,
    output logic [31:0] result
);
    assign result = a + b;
endmodule
```

AND the output SHALL include `` `timescale 1ns / 1ps `` before the module
AND the output SHALL include `` `default_nettype none `` before the module
AND the output SHALL include the generator header comment

ACCEPTANCE: `bun run compile:example` succeeds with a valid .sv file matching the pattern above.

---

## SCENARIO: Boolean comparison function

GIVEN a TypeScript source file with a function returning `boolean`:
```typescript
function isGreater(a: number, b: number): boolean {
    return a > b;
}
```

WHEN compiled

THEN the output SHALL declare `output logic result` (not `output logic [31:0]`)
AND SHALL assign `result = (a > b)`

ACCEPTANCE: The generated SV passes `bun run quality` linter checks.

---

## SCENARIO: Hex literal sizing

GIVEN a TypeScript function using a hex literal:
```typescript
function mask(x: number): number {
    return x & 0xFF;
}
```

WHEN compiled

THEN the hex literal SHALL be emitted as `32'hFF` (not `0xFF` or bare `255`)

ACCEPTANCE: No TypeScript artifacts appear in the generated .sv file.

---

## SCENARIO: Arithmetic right shift

GIVEN a TypeScript function using `>>>`:
```typescript
function signedShift(x: number): number {
    return x >>> 1;
}
```

WHEN compiled

THEN the output SHALL contain `x >>> 1` (IEEE 1800-2017 §11.4.10 arithmetic right shift)

ACCEPTANCE: Yosys can synthesize the output without errors.

---

## SCENARIO: if/else to ternary mux

GIVEN a TypeScript function with `if/else`:
```typescript
function mux(sel: boolean, a: number, b: number): number {
    if (sel) {
        return a;
    } else {
        return b;
    }
}
```

WHEN compiled

THEN the output SHALL use a continuous `assign` statement with a ternary mux
AND SHALL NOT contain an `always_comb` block
AND SHALL NOT produce an inferred latch

ACCEPTANCE: Yosys synthesis with `synth_gowin` completes without latch warnings.

---

## SCENARIO: Underscore separator stripping

GIVEN a numeric literal `10_000` in TypeScript source

WHEN compiled

THEN the output SHALL contain `32'd10000` (underscores stripped)

ACCEPTANCE: Literal appears correctly in the generated .sv.

---

## SCENARIO: Forbidden construct rejection — class

GIVEN a TypeScript source file containing a `class` declaration

WHEN the functional compiler processes it

THEN the compiler SHALL emit an error with code TS2V-2000
AND the error message SHALL contain the line and column of the `class` keyword
AND the compiler SHALL exit with non-zero status

ACCEPTANCE: `bun run test:root` regression suite covers this case.

---

## SCENARIO: Forbidden construct rejection — arrow function

GIVEN a TypeScript source file containing `const fn = (x: number): number => x + 1;`

WHEN the functional compiler processes it

THEN the compiler SHALL emit an error with code TS2V-2000
AND SHALL NOT produce any SystemVerilog output

ACCEPTANCE: Error includes source location; exit code is non-zero.
