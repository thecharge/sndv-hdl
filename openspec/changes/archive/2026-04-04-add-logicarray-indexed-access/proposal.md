## Why

The `LogicArray` runtime type is the natural way for TypeScript developers to declare hardware signal arrays, but the class compiler does not recognise the `LogicArray<W, SIZE>` identifier during type parsing. As a result, any field declared as `LogicArray<8, 4>` is silently treated as an unknown type and emitted incorrectly (or not at all), leaving authors with no choice but to use the less-ergonomic `Logic<8>[]` form with a separate size annotation. First-class `LogicArray` support closes this gap and enables safe indexed reads and writes inside `@Sequential` and `@Combinational` methods.

## What Changes

- The class-declaration parser (`class-decl-parser.ts`) gains recognition of the `LogicArray<W, SIZE>` identifier, mapping it to `is_array: true`, `bit_width: W`, `array_size: SIZE` in the property AST.
- `parseTypeSpec` is extended to accept `LogicArray` as a first-class type token alongside `Logic`, `Bit`, and `UintN`.
- Array-size enforcement is tightened: when `array_size` is 0 or missing at emission time the compiler emits a diagnostic (using the existing `ERROR_ARRAY_SIZE_REQUIRED` code) instead of silently producing malformed SV.
- The `@ts2v/runtime` package documentation and JSDoc for `LogicArray` is updated to reflect the now-supported declaration syntax.
- An end-to-end hardware example (`examples/hardware/tang_nano_20k/shift_register/`) demonstrates `LogicArray` in a `@Sequential` method with indexed writes.

**No breaking changes.** Existing designs using `Logic<N>[]` continue to compile unchanged.

## Capabilities

### New Capabilities

- `logicarray-type-parsing`: First-class recognition of `LogicArray<W, SIZE>` in the class compiler type parser, producing correct `is_array / bit_width / array_size` property AST nodes and enforcing non-zero array size at emission time.

### Modified Capabilities

- `ts-to-sv-compiler-core`: The class compiler's type-spec parser now accepts `LogicArray` as a valid type token. The error-enforcement path for missing array sizes becomes active.
- `hardware-decorators-and-runtime`: `LogicArray` JSDoc and usage guidance updated to describe the supported declaration form.

## Impact

- **packages/core/src/compiler/class-compiler/class-decl-parser.ts** - extend `parseTypeSpec` to branch on `LogicArray` identifier.
- **packages/core/src/compiler/class-compiler/class-module-emitter.ts** - enforce `ERROR_ARRAY_SIZE_REQUIRED` when `array_size` is 0 before emitting a logic array declaration.
- **packages/runtime/src/types.ts** - improve JSDoc for `LogicArray<W, SIZE>` to show the supported syntax.
- **examples/hardware/tang_nano_20k/shift_register/** - new example exercising `LogicArray` reads and writes inside `@Sequential`.
- **openspec/specs/ts-to-sv-compiler-core/** - `requirements.md` updated to capture `LogicArray` type recognition requirements.
- **openspec/specs/hardware-decorators-and-runtime/** - `requirements.md` updated to reflect supported runtime types.
- No CLI, toolchain, board config, or testbench changes required.

## Non-goals

- No support for dynamically-sized arrays (array size must be a positive integer literal in the type generic).
- No multi-dimensional array support.
- No proprietary EDA tools; this change is purely compiler-side.
- No change to the functional (non-class) compiler.

## OSS Toolchain Impact

None. This change affects only the TypeScript-to-SV type-parsing phase. Generated SV syntax (`logic [W-1:0] name [0:SIZE-1]`) is already supported by Yosys and nextpnr.

## Delivery Gates

- `bun run quality` passes.
- `bun run compile:example` generates correct `.sv` artifacts for the new `shift_register` example.
- `bun run test:uvm` passes (no testbench changes required; existing tests must remain green).
- Compiler Agent owns all parser and emitter changes.
- QA Agent verifies generated SV array declaration shape matches IEEE 1800-2017.
