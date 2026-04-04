## Context

The class compiler currently recognises signal arrays only when the TypeScript source uses a trailing `[]` after a `Logic<N>` or primitive type token (e.g., `Logic<8>[]`). The runtime package exposes `LogicArray<W, SIZE>` as a convenience alias (`number[]`) for exactly this purpose, but `parseTypeSpec` in `class-decl-parser.ts` never tests for the identifier `"LogicArray"` — it falls through to the unknown-type branch and silently produces a `bit_width: 32, array_size: 0` property, which the emitter skips or emits incorrectly.

The compiler already supports indexed assignment targets (`this.arr[i] = v`) in `class-stmt-parser.ts` and the sequential/combinational emitters already emit them as nonblocking assignments (`<=`). The gap is purely in the type-parsing layer: array metadata is missing, so the module emitter never declares the array as `logic [W-1:0] name [0:SIZE-1]`.

A secondary gap is that the existing `ERROR_ARRAY_SIZE_REQUIRED` error constant is defined but never enforced at emission time, meaning a `Logic<8>[]` declaration without a size can also pass through silently.

## Goals / Non-Goals

**Goals:**
- `parseTypeSpec` recognises `LogicArray<W, SIZE>` and populates `is_array`, `bit_width`, `array_size` correctly.
- Emission gate: if `array_size` is 0 at `class-module-emitter` internals-emission time, emit a `CompilerError` with code `ERROR_ARRAY_SIZE_REQUIRED`.
- JSDoc on `LogicArray<W, SIZE>` in `packages/runtime/src/types.ts` explains the supported declaration form.
- One new hardware example demonstrates the feature.

**Non-Goals:**
- Multi-dimensional arrays.
- Dynamically-sized arrays (size must be a literal integer).
- Functional (non-class) compiler changes.
- Any change to the `Logic<N>[]` syntax (stays valid, unchanged).

## Decisions

**Decision 1: Parse `LogicArray` at the identifier branch in `parseTypeSpec`**

The existing `parseTypeSpec` function branches on a `TokenKind` enum. `LogicArray` arrives as a `TokenKind.Identifier` whose `value` is `"LogicArray"`. The cleanest fix is to add a branch alongside `"Logic"` handling that: (a) expects `<`, (b) reads two comma-separated positive integers (`W` and `SIZE`), (c) expects `>`, (d) sets `is_array: true, bit_width: W, array_size: SIZE`.

Alternative considered: map the alias at runtime type level by post-processing unknown type annotations. Rejected — adds complexity and a second pass; the parser branch is minimal and correct.

**Decision 2: Enforce `array_size > 0` at emission, not at parse**

An array can have a size inferred from an initializer later in the pipeline (consistent with how the typechecker currently fills `array_size` from array literals). Enforcing at emission (inside `class-module-emitter.emitModuleInternals`) preserves the existing inference path and catches the case where no initializer exists and no literal size was given.

**Decision 3: No new AST node**

`PropertyAST` already carries `is_array: boolean`, `bit_width: number`, `array_size: number`. Adding `LogicArray` recognition requires no new AST types — only correct population of existing fields.

## Risks / Trade-offs

- **Risk: Compiler silently accepted `LogicArray<W, SIZE>` before (as unknown type).** Designs that previously used `LogicArray` and relied on the no-op behaviour will now generate a correctly-declared array or a diagnostic. This is the desired fix, but authors should audit any existing designs.
  - Mitigation: the change is additive; if a design compiled before and used `Logic<N>[]` it remains unaffected.
- **Risk: The new emission gate may surface latent `array_size: 0` bugs in existing test fixtures.**
  - Mitigation: run `bun run quality` and `bun run test:uvm` before merging; fix any exposed fixtures.

## Open Questions

- Should `LogicArray<W>` (single-generic) be accepted with `SIZE = 0` as a declaration of an unsized-array placeholder? Current decision: no — both generics are required, and the parser emits a diagnostic if only one is supplied. This can be revisited if there is a valid use case.
