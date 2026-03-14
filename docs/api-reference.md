# ts2v API Reference

## Package Entry Points
- `@ts2v/types`: shared contracts (`CompileRequest`, `CompileResult`, `ToolchainAdapter`, `WorkspaceConfiguration`).
- `@ts2v/config`: configuration repository/service.
- `@ts2v/core`: compiler facade and compiler engine integration.
- `@ts2v/process`: process execution and runtime detection.
- `@ts2v/toolchain`: synthesis/programming facade and adapters.
- `@ts2v/cli`: command-line entrypoint (`bun run apps/cli/src/index.ts compile ...`).

## Compiler Paths (Canonical)
- `packages/core/src/compiler/class-compiler/*`
- `packages/core/src/compiler/lexer/*`
- `packages/core/src/compiler/parser/*`
- `packages/core/src/compiler/typechecker/*`
- `packages/core/src/compiler/codegen/*`
- `packages/core/src/compiler/pipeline/*`
- `packages/core/src/compiler/config/*`
- `packages/core/src/compiler/constraints/*`
- `packages/core/src/compiler/lint/*`

## CLI
```bash
bun run apps/cli/src/index.ts compile <input.ts|input-dir> [--out <dir>] [--board <board.json>] [--flash]
```

## Toolchain
Primary workflow:
1. `bun run compile:example`
2. `bun run flash:tang20k .artifacts/tang20k/tang_nano_20k_blinker.fs`

Low-level USB probe scan:
```bash
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```
