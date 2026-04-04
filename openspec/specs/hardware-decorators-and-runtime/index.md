# hardware-decorators-and-runtime

**Owner:** Compiler Agent (decorator semantics), Build Agent (package publishing)
**Status:** Production
**Version:** Bootstrap 1.0

## Summary

The `@ts2v/runtime` package provides the TypeScript surface that hardware designers write
against. It exposes all decorators (`@Module`, `@Input`, `@Output`, `@Sequential`,
`@Combinational`, `@Submodule`, `@Assert`, `@ModuleConfig`) and all hardware types
(`Logic<N>`, `Bit`, `UintN`/`UIntN`, `LogicArray<W,S>`, `HardwareModule`).

At runtime all decorators are no-ops — they exist solely so TypeScript tooling (language
server, build tools) can process hardware source files without errors. The actual semantic
transformation happens in the Compiler Agent's `packages/core/` compiler, which reads
the decorator names and their arguments as AST annotations.

## Files

- `requirements.md` - SHALL statements for the runtime package
- `constraints.md` - Rules for what decorators may and may not do
- `scenarios/decorator-usage.md` - Acceptance scenarios for each decorator

## Key Source Locations

| Path | Responsibility |
|---|---|
| `packages/runtime/src/decorators.ts` | All decorator implementations (no-ops) |
| `packages/runtime/src/types.ts` | Logic<N>, Bit, UintN, LogicArray type definitions |
| `packages/runtime/src/module.ts` | HardwareModule base class |
| `packages/runtime/src/index.ts` | Public package exports |

## Type Mapping

| TypeScript | SystemVerilog | Notes |
|---|---|---|
| `Logic<N>` | `logic [N-1:0]` | Primary N-bit type |
| `Bit` | `logic` | 1-bit alias |
| `UintN` / `UIntN` | `logic [N-1:0]` | Tested up to >64 bits |
| `LogicArray<W,S>` | Register file (declared only) | Indexed sequential access is a known limitation |

## Related Capabilities

- `ts-to-sv-compiler-core` - reads these decorators as AST annotations
- `example-hardware-designs` - all hardware examples depend on this package
