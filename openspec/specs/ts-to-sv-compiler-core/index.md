# ts-to-sv-compiler-core

**Owner:** Compiler Agent
**Status:** Production (class compiler), Production (functional compiler)
**Version:** Bootstrap 1.0

## Summary

The core compilation engine that translates a strict subset of TypeScript source into
IEEE 1800-2017 SystemVerilog modules. This is the central capability of the ts2v project.

Two compilation modes are supported:

- **Class compiler** (primary): `@Module`-decorated TypeScript classes with `@Sequential`,
  `@Combinational`, `@Input`, `@Output`, `@Submodule`, and `@Assert` decorators compile to
  `always_ff`/`always_comb` SV modules. This is the recommended path for all new hardware.

- **Functional compiler** (legacy): bare TypeScript `function` declarations compile to
  purely combinational SV modules with `assign` statements.

The pipeline: Lexer -> Token Stream -> Parser -> AST -> TypeChecker -> CodeGenerator -> .sv

## Files

- `requirements.md` - SHALL statements
- `constraints.md` - Non-functional rules and TypeScript subset restrictions
- `scenarios/functional-compiler.md` - Functional compiler acceptance scenarios
- `scenarios/class-compiler.md` - Class compiler acceptance scenarios

## Key Source Locations

| Path | Responsibility |
|---|---|
| `packages/core/src/compiler/class-compiler/` | Class-mode parser, emitter, sequential emitter |
| `packages/core/src/compiler/compiler-engine.ts` | Functional-mode pipeline entry |
| `packages/core/src/compiler/lexer/` | Lexer (error prefix TS2V-1000) |
| `packages/core/src/compiler/parser/` | Functional parser (error prefix TS2V-2000) |
| `packages/core/src/compiler/typechecker/` | Type checker (error prefix TS2V-3000) |
| `packages/core/src/compiler/codegen/` | Code generator (error prefix TS2V-4000) |
| `packages/core/src/compiler/constraints/` | Board constraint generator (.cst / .xdc) |
| `packages/core/src/facades/` | Ts2vCompilationFacade — public API |
| `packages/core/src/adapters/` | LegacyCompilerAdapter — glue layer |

## Error Code Namespace

| Code Range | Origin |
|---|---|
| TS2V-1000 | Lexer |
| TS2V-2000 | Parser |
| TS2V-3000 | Type checker |
| TS2V-4000 | Code generator |

## Related Capabilities

- `hardware-decorators-and-runtime` - defines the TypeScript surface the compiler reads
- `board-configuration-and-support` - constraint generator is part of this pipeline
- `ts-to-sv-compiler-core` feeds the `open-source-toolchain-integration` synthesis stage
