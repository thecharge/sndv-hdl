## 1. Runtime Decorator

- [x] 1.1 Add `Param` property decorator export to `packages/runtime/src/decorators.ts` (runtime no-op, with JSDoc describing its SV semantics)
- [x] 1.2 Re-export `Param` from `packages/runtime/src/index.ts`

## 2. AST and Parser

- [x] 2.1 In `packages/core/src/compiler/class-compiler/class-module-ast.ts`, add `parameters: { name: string; bit_width: number; default_value: number }[]` to `ClassModuleAST` and `ModuleSignature`
- [x] 2.2 In `packages/core/src/compiler/class-compiler/class-module-parser.ts`, detect `@Param`-decorated properties in the class body; parse their type width and numeric literal initialiser; populate `ClassModuleAST.parameters`
- [x] 2.3 Emit a `CompilerError` if a `@Param` property has no numeric literal initialiser
- [x] 2.4 Emit a `CompilerError` if a `@Param` property name collides with a port or internal property name

## 3. Module Emitter

- [x] 3.1 In `packages/core/src/compiler/class-compiler/class-module-emitter.ts`, update `emitModule` to emit the `#(parameter logic [W-1:0] NAME = DEFAULT, ...)` parameter port list before the regular port list when `parameters.length > 0`
- [x] 3.2 Update `registerModuleSignature` to include the `parameters` array in the stored `ModuleSignature`
- [x] 3.3 Update `emitSubmoduleInst` to emit `#(.NAME(VALUE), ...)` parameter overrides when the submodule signature has parameters and override values are provided

## 4. Example

- [x] 4.1 Create `examples/hardware/tang_nano_20k/generic_counter/generic_counter.ts` implementing a parameterised up-counter with `@Param WIDTH: Logic<8> = 8` and instantiating two counters at different widths from a top-level module
- [x] 4.2 Verify `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/generic_counter --board boards/tang_nano_20k.board.json --out /tmp/counter_out` generates `.sv` with `#(parameter ...)` declarations

## 5. Quality Gate

- [x] 5.1 Run `bun run quality` and confirm it passes
- [x] 5.2 Run `bun run test:uvm` and confirm no regressions
