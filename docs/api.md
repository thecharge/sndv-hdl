# API Overview

## `@ts2v/types`
Shared contracts used across all packages.

Key interfaces:
- `CompileRequest`
- `CompileResult`
- `CompilerAdapter`
- `ProcessRunner`
- `ToolchainAdapter`
- `WorkspaceConfiguration`

## `@ts2v/config`
Configuration repository and service for workspace/board settings.

Public API:
- `WorkspaceConfigurationRepository`
- `WorkspaceConfigurationService`
- `DEFAULT_WORKSPACE_CONFIGURATION`

## `@ts2v/core`
Compilation facade for TypeScript -> SystemVerilog conversion.

Public API:
- `Ts2vCompilationFacade`

Behavior:
- Executes compile command through adapter boundary.
- Emits `.sv`, constraints, and `sim.f` artifacts.

## `@ts2v/process`
External process abstraction.

Public API:
- `BunProcessRunner`
- `RuntimeDetectionRepository`

## `@ts2v/toolchain`
Hardware synthesis/programming entrypoints and adapters.

Public API:
- `TangNano20kToolchainFacade`

Behavior:
- Resolves container runtime (`podman`/`docker`).
- Runs synthesis commands inside container.
- Runs programming command via openFPGALoader.

## `@ts2v/cli`
Runtime command line entry.

Supported command:
- `ts2v compile <input.ts|input-dir> [--out <dir>] [--board <board.json>] [--flash]`
