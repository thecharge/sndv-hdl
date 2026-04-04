## Why

TypeScript developers adopting ts2v face several friction points that do not exist in mainstream TypeScript libraries: the `Logic<N>` generic silently accepts any `number` (the bit-width constraint is invisible to the type checker and editor), `HardwareModule`'s index signature wipes IntelliSense for decorated subclass fields, `CompileDiagnostic` carries no source location so compiler errors cannot be linked to editor lines, and testbench types must be manually copied from the repository rather than imported from a package. Collectively these gaps make the learning curve steeper than necessary and reduce confidence during authoring. This change targets the highest-impact DX improvements: branded runtime types, improved diagnostics structure, published testbench types, and comprehensive JSDoc.

## What Changes

- `Logic<N>` becomes a lightweight branded type (`number & { __bits?: N }`) so editor hover reveals the bit width and accidental width mismatches surface as type errors.
- `HardwareModule` drops the catch-all `[key: string]: unknown` index signature; decorated member access becomes typed on subclasses.
- `CompileDiagnostic` in `packages/types` gains an optional `location: { filePath?: string; line?: number; column?: number }` field; the legacy compiler adapter and all `CompilerError` propagation paths are updated to populate it.
- Testbench spec types (`SeqTestSpec`, `CombTestSpec`, `TbSpec`) are exported from `@ts2v/types` (or a new `@ts2v/testbench-types` package) so external projects can `import type { SeqTestSpec } from '@ts2v/types'` instead of copying files.
- JSDoc is added to every exported symbol in `packages/runtime` and `packages/types`.
- A `docs/guides/runtime-api.md` reference guide is added covering decorators, runtime types, patterns, and recommended `tsconfig.json` settings.
- Getting-started guide formatting issues are fixed.
- A `--diagnostics=json` CLI flag option is added to emit machine-readable diagnostic output.

**Potentially breaking (minor):** removing `HardwareModule`'s index signature may surface type errors in existing user subclasses that relied on dynamic property access. Migration: use explicit type annotations on all decorated fields.

## Capabilities

### New Capabilities

- `runtime-branded-types`: `Logic<N>`, `Bit`, `UintN` become branded number types; `LogicArray<W, SIZE>` becomes a branded array type; all carry their width in the type system.
- `structured-compiler-diagnostics`: `CompileDiagnostic` carries optional source location; all compiler error paths populate it; CLI can emit JSON diagnostics via `--diagnostics=json`.
- `testbench-types-package`: Testbench spec types published as importable package exports.

### Modified Capabilities

- `hardware-decorators-and-runtime`: `HardwareModule` index signature removed; JSDoc added to all exports.
- `ts-to-sv-compiler-core`: Diagnostic emission paths updated to populate `CompileDiagnostic.location`.
- `cli-and-workflow-orchestration`: `--diagnostics=json` flag added.
- `documentation-and-compliance`: `docs/guides/runtime-api.md` added; getting-started fixed; README docs index updated.

## Impact

- **packages/runtime/src/types.ts** - brand `Logic`, `Bit`, `UintN`, `LogicArray`.
- **packages/runtime/src/module.ts** - remove `[key:string]: unknown`; add JSDoc.
- **packages/runtime/src/decorators.ts** - add JSDoc to all decorators.
- **packages/types/src/compiler.ts** - add `location` field to `CompileDiagnostic`.
- **packages/types/src/index.ts** - export testbench spec types (or reference new package).
- **packages/core/src/adapters/legacy-compiler-adapter.ts** - propagate `CompilerError.location` into `CompileDiagnostic`.
- **apps/cli/src/commands/compile-command-handler.ts** - add `--diagnostics=json` output path.
- **testbenches/tb-spec-types.ts** - contents moved to `packages/types/src/testbench.ts`.
- **docs/guides/runtime-api.md** - new guide.
- **docs/guides/getting-started.md** - formatting fixes.
- **README.md** - add `runtime-api.md` to docs index.

## Non-goals

- No full Zod/io-ts runtime validation of hardware types.
- No LSP plugin or custom language server.
- No change to the TypeScript subset accepted by the compiler.
- No proprietary EDA tools.

## OSS Toolchain Impact

None. This change is entirely TypeScript-side authoring ergonomics.

## Delivery Gates

- `bun run quality` passes (including type checks on examples that use the updated `HardwareModule`).
- `bun run compile:example` generates correct artifacts (no regressions).
- `bun run test:uvm` passes.
- Compiler Agent owns diagnostic-propagation changes; Build Agent owns types and runtime package changes; Documentation Agent owns `runtime-api.md`.
