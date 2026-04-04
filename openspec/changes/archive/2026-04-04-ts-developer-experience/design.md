## Context

Three distinct DX gaps were identified from codebase analysis:

1. **Runtime types are too permissive.** `Logic<N>` is a plain `number` alias — the `N` generic is erased and provides zero editor value. `HardwareModule` uses `[key: string]: unknown`, which destroys IntelliSense for decorated subclass fields.

2. **Diagnostics lack source location.** `CompileDiagnostic` has no `location` field. `CompilerError` (the internal structured error) does carry line/col but it is not propagated into the `CompileDiagnostic` objects returned to the CLI. Editors and CI cannot link errors to specific source lines.

3. **Testbench types are not packageable.** `SeqTestSpec`, `CombTestSpec`, and `TbSpec` live in `testbenches/tb-spec-types.ts` and must be copied into user projects or imported via an awkward relative path. They should be a published package export.

Design decisions prioritise non-breaking changes: branding `Logic<N>` uses an intersection type that is still assignable from `number`, preserving all existing code.

## Goals / Non-Goals

**Goals:**
- `Logic<N>` branded with `{ __bits?: N }` so editors show the width and mismatches are visible.
- `HardwareModule` index signature removed; decorated fields typed correctly on subclasses.
- `CompileDiagnostic.location` field added; legacy adapter propagates `CompilerError.location`.
- Testbench types moved to `packages/types/src/testbench.ts` and exported from `@ts2v/types`.
- JSDoc on all exported symbols in `packages/runtime` and `packages/types`.
- `docs/guides/runtime-api.md` new guide.
- `--diagnostics=json` CLI flag.

**Non-Goals:**
- Full Zod runtime validation of hardware types.
- Custom LSP or language server.
- TypeScript subset changes.
- Proprietary EDA tools.

## Decisions

**Decision: Branded `Logic<N>` via intersection**

`number & { __bits?: N }` is assignable from plain `number` (no breaking changes to existing code), preserves arithmetic operations (TypeScript allows arithmetic on intersection types with `number`), and makes the bit width visible in editor hover. A fully opaque nominal type was considered but rejected — it would break all existing numeric assignments to `Logic<N>` fields.

**Decision: Remove `HardwareModule` index signature, not replaced with a mapped type**

Replacing with a mapped type (`HardwareModule<Ports extends Record<string, Logic<any>>>`) would require all existing class declarations to supply a generic. Instead, removing the index signature alone is sufficient: TypeScript class instances already know their own declared properties; the index signature was only needed to allow untyped dynamic access, which is not a legitimate use case for hardware modules. Authors that used dynamic access will get a type error — correct, intentional.

**Decision: Testbench types moved to `packages/types`, not a new package**

Adding a new package increases monorepo overhead. `packages/types` is already the shared-types home. Adding a `src/testbench.ts` file with re-export from `index.ts` is the minimal change. A separate `@ts2v/testbench-types` package can be created later if package-boundary reasons arise.

**Decision: `--diagnostics=json` outputs NDJSON (one JSON object per line)**

NDJSON is easy to pipe to `jq`, consumed by most CI tools, and avoids the need to buffer a complete JSON array. Each line is a serialised `CompileDiagnostic` object.

## Risks / Trade-offs

- **Risk: Removing `HardwareModule` index signature may break user subclasses that used `(this as any).prop`.** These were already unsafe patterns.
  - Mitigation: document the breaking change with a migration note; since no downstream users are known outside the repo, risk is low.
- **Risk: Branded `Logic<N>` may cause type errors in edge cases where `number` was assigned to a `Logic<N>` field through a conditional type or generic.** The intersection approach minimises this.
  - Mitigation: run `bun run quality` (full type check) after the change; fix any revealed issues.
