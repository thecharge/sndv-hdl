# Development Guide

## Prerequisites
- Ubuntu Linux
- Bun 1.3+
- Podman or Docker
- Git

## Install
```bash
bun install
```

## Day-to-Day Commands
```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run quality
```

## Compile Workflow
```bash
bun run apps/cli/src/index.ts compile examples/blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/tang20k
```

Artifacts are generated in `.artifacts/tang20k`:
- `*.sv`
- `*.cst`
- `sim.f`

## Process Handling
- All external command execution is isolated in `@ts2v/process`.
- Container runtime resolution follows priority order in `configs/workspace.config.json`.
- Board toolchain invocation is isolated in `@ts2v/toolchain` adapters.
