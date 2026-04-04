## 1. Runtime Type Branding

- [x] 1.1 In `packages/runtime/src/types.ts`, change `Logic<N>` to `number & { __bits?: N }`, `Bit` to `Logic<1>`, `UintN` aliases to their corresponding `Logic<N>` widths, and `LogicArray<W, SIZE>` to `number[] & { __bitWidth?: W; __size?: SIZE }`
- [x] 1.2 Add JSDoc to every type alias in `packages/runtime/src/types.ts` explaining the type, its bit-width semantics, and a usage example

## 2. HardwareModule Index Signature

- [x] 2.1 In `packages/runtime/src/module.ts`, remove the `[key: string]: unknown` index signature from `HardwareModule`
- [x] 2.2 Add JSDoc to `HardwareModule` explaining its role as the base class for synthesisable hardware modules
- [x] 2.3 Run `bun run quality` after this change to surface any type errors introduced; fix all type errors in the examples directory

## 3. Decorator JSDoc

- [x] 3.1 In `packages/runtime/src/decorators.ts`, ensure every exported decorator (`Module`, `Input`, `Output`, `Submodule`, `Sequential`, `Combinational`, `Assert`, `ModuleConfig`) has a complete JSDoc comment with parameter descriptions

## 4. Testbench Types Package Export

- [x] 4.1 Move the contents of `testbenches/tb-spec-types.ts` to `packages/types/src/testbench.ts`
- [x] 4.2 Export `SeqTestSpec`, `CombTestSpec`, `TbSpec` from `packages/types/src/index.ts`
- [x] 4.3 Update `testbenches/tb-spec-types.ts` to re-export from `@ts2v/types` (for backward compat) with a `@deprecated` comment
- [x] 4.4 Update any testbench files that import from `testbenches/tb-spec-types.ts` to import from `@ts2v/types`

## 5. Structured Diagnostics

- [x] 5.1 In `packages/types/src/compiler.ts`, add `location?: { filePath?: string; line?: number; column?: number }` to `CompileDiagnostic`
- [x] 5.2 In `packages/core/src/adapters/legacy-compiler-adapter.ts`, when catching a `CompilerError`, populate `diagnostic.location` from `error.location` if present
- [x] 5.3 Add JSDoc to all types in `packages/types/src/*.ts`

## 6. CLI --diagnostics=json Flag

- [x] 6.1 In `apps/cli/src/parsers/cli-arguments-parser.ts`, add `--diagnostics=json` optional flag to the parsed `CliArguments` type
- [x] 6.2 In `apps/cli/src/commands/compile-command-handler.ts`, when `--diagnostics=json` is set, print each `CompileDiagnostic` as a JSON line to stdout instead of the human-readable format

## 7. Documentation

- [x] 7.1 Create `docs/guides/runtime-api.md` covering: all decorators with parameters and examples, runtime types with bit-width semantics, `HardwareModule` usage, `Bits` namespace, recommended `tsconfig.json` settings, and patterns for multi-file module design
- [x] 7.2 Fix formatting issues in `docs/guides/getting-started.md` (remove duplicate code fence header)
- [x] 7.3 Add `runtime-api.md` to the Documentation Index in `README.md`

## 8. Quality Gate

- [x] 8.1 Run `bun run quality` and confirm it passes with zero type errors
- [x] 8.2 Run `bun run compile:example` and confirm no regressions in generated SV
- [x] 8.3 Run `bun run test:uvm` and confirm all testbench specs pass
