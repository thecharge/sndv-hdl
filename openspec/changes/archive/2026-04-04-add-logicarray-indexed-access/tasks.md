## 1. Runtime JSDoc

- [x] 1.1 Add JSDoc comment to `LogicArray<W, SIZE>` in `packages/runtime/src/types.ts` explaining supported declaration form and that both generics are required

## 2. Parser Changes

- [x] 2.1 In `packages/core/src/compiler/class-compiler/class-decl-parser.ts`, add a branch in `parseTypeSpec` to handle `TokenKind.Identifier` with value `"LogicArray"`: consume `<`, parse two comma-separated positive integer literals (W and SIZE), consume `>`, set `is_array: true`, `bit_width: W`, `array_size: SIZE`
- [x] 2.2 If only one generic argument is supplied, emit a compiler diagnostic and fall back to `bit_width: 8, array_size: 0` (which the emission gate will then catch)

## 3. Emission Gate

- [x] 3.1 In `packages/core/src/compiler/class-compiler/class-module-emitter.ts`, in the internals-emission loop, replace the silent `if (p.is_array && p.array_size > 0)` skip with a `CompilerError` throw using `ERROR_ARRAY_SIZE_REQUIRED` when `array_size` is 0 for an `is_array` property

## 4. Example

- [x] 4.1 Create `examples/hardware/tang_nano_20k/shift_register/shift_register.ts` implementing an 8-bit shift register using `LogicArray<1, 8>` with indexed reads and writes inside a `@Sequential` method
- [x] 4.2 Verify `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/shift_register --board boards/tang_nano_20k.board.json --out /tmp/shift_reg_out` generates a `.sv` file with correct `logic [0:0] shift_reg [0:7]` declaration

## 5. Quality Gate

- [x] 5.1 Run `bun run quality` and confirm it passes with no new errors
- [x] 5.2 Run `bun run test:uvm` and confirm no regressions
