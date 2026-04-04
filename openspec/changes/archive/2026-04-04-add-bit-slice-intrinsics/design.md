## Context

TypeScript's syntax does not allow a colon inside an index expression (`signal[7:0]` is a syntax error). The only ergonomic way to expose SV part-select to TypeScript authors is through a helper function that the compiler recognises as an intrinsic. `Bits.slice(signal, msb, lsb)` is a clear, self-documenting surface that maps 1:1 to `signal[msb:lsb]` in generated SV.

The expression AST (`packages/core/src/compiler/parser/ast.ts`) already has an `ArrayAccess` node for single-index access. A new `SliceAccess` node with three children (source expression, msb expression, lsb expression) is the minimal AST addition required.

## Goals / Non-Goals

**Goals:**
- `Bits.slice(signal, msb, lsb)` -> `signal[msb:lsb]` in generated SV.
- `Bits.bit(signal, i)` -> `signal[i]` (convenience alias; same as single-index access but via named helper).
- `SliceAccess` AST node, parser recognition, typechecker typing, emitter rendering.
- `bus_splitter` example.

**Non-Goals:**
- Part-select assignment (left-hand side `signal[msb:lsb] = ...`).
- Bracket-colon syntax natively in TypeScript source.
- Functional compiler changes.

## Decisions

**Decision: Static namespace `Bits` with `slice` and `bit` methods as intrinsics**

A static namespace (`Bits.slice`) is recognisable by the parser as a qualified call with a known prefix. Alternative of overloading the array index operator is not feasible in TypeScript syntax. Alternative of a standalone `slice()` function was considered but rejected — namespacing under `Bits` groups related bit-manipulation helpers and avoids name collisions with user-defined functions.

**Decision: Parser recognises the call as an intrinsic, not a general function call**

The parser detects a `CallExpression` with callee `Bits.slice` or `Bits.bit` and produces a `SliceAccess` node directly, avoiding the need for a general "intrinsic function" mechanism. This is consistent with how the compiler handles other special constructs.

**Decision: Typechecker produces `bit_width = msb - lsb + 1` only for numeric literal bounds**

For non-literal bounds the result type is `logic<1>` (conservative). This avoids requiring constant folding in this iteration and is safe for synthesis.

## Risks / Trade-offs

- **Risk: `Bits` name collides with a user-defined variable or class.** The compiler checks for this at parse time and emits a warning, but does not hard-error (user code is still valid TypeScript).
  - Mitigation: document `Bits` as a reserved compiler namespace in the runtime JSDoc.
- **Risk: Non-literal slice bounds produce a narrow conservative type.** Authors relying on variable-width slices will not get accurate bit-width typing.
  - Mitigation: document this limitation; expand constant folding in a follow-up.
