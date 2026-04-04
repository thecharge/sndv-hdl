## Why

The compile-to-flash pipeline currently has two coupled, board-specific coupling points: (1) `compile-command-handler.ts` hardcodes `TangNano20kToolchainFacade` for synthesis and flash, and (2) `TangNano20kToolchainFactory` hardcodes `SupportedBoardId.TangNano20k` when resolving board configuration from the workspace. As a result, passing `--board boards/tang_nano_9k.board.json` to the CLI generates the correct constraint file but then runs the wrong synthesis device and programmer. Supporting any additional verified board (Tang Nano 9K now; others in the future) requires cloning and hardcoding a new handler branch. This change replaces the hardcoded board selection with a board-driven dispatch so the `--board` flag is the single source of truth end-to-end.

## What Changes

- A `BoardRegistry` service is introduced in `packages/toolchain/` that maps a board JSON `id` field to the appropriate `ToolchainAdapter` factory.
- `compile-command-handler.ts` resolves the `--board` argument to a canonical `SupportedBoardId` and asks `BoardRegistry` for the matching `ToolchainAdapter` instead of hardcoding `TangNano20kToolchainFacade`.
- `CompileRequest` gains an optional `resolvedBoardId?: SupportedBoardId` field so the board identity does not have to be re-derived from the JSON path during the toolchain phase.
- The two constraint-generation implementations (`compiler-engine.generateConstraints` and `board-constraint-gen.ts`) are unified behind a single exported function `generateBoardConstraints(boardDefinition, outDir): string` in `packages/core/`.
- Tang Nano 9K is promoted to full synthesis-and-flash support, registered in `BoardRegistry`.
- Existing Tang Nano 20K behaviour is fully preserved; no example changes required.

**No breaking changes.** Existing CLI invocations using `--board boards/tang_nano_20k.board.json` continue to work identically.

## Capabilities

### New Capabilities

- `board-toolchain-registry`: A `BoardRegistry` service that maps `SupportedBoardId` to `ToolchainAdapter` factories, enabling dynamic board dispatch without hardcoded handler branches.

### Modified Capabilities

- `cli-and-workflow-orchestration`: `compile-command-handler` resolves board from CLI argument dynamically; gains `resolvedBoardId` propagation.
- `open-source-toolchain-integration`: Constraint generation is unified into a single canonical function; Tang Nano 9K is registered for full synthesis and flash.
- `board-configuration-and-support`: Tang Nano 9K entry updated from constraint-only to fully-supported.

## Impact

- **packages/toolchain/src/services/board-registry.ts** - new file; registry mapping board id to factory.
- **packages/types/src/compiler.ts** - add `resolvedBoardId?: SupportedBoardId` to `CompileRequest`.
- **apps/cli/src/commands/compile-command-handler.ts** - replace hardcoded `TangNano20kToolchainFacade` with `BoardRegistry` lookup.
- **packages/core/src/compiler/constraints/** - unify both constraint-gen implementations into `generate-board-constraints.ts`; deprecate `compiler-engine.generateConstraints`.
- **packages/core/src/adapters/legacy-compiler-adapter.ts** - call the unified constraint generator.
- **packages/config/src/constants/default-workspace-configuration.ts** - Tang Nano 9K synthesis/flash config verified and complete.
- **openspec/specs/cli-and-workflow-orchestration/**, **openspec/specs/open-source-toolchain-integration/**, **openspec/specs/board-configuration-and-support/** - requirement updates.

## Non-goals

- No new board definitions beyond Tang Nano 9K (adding more boards is a separate per-board proposal per the AGENTS.md board-support policy).
- No GUI or programmatic board-selection API changes beyond CLI.
- No proprietary EDA tools.
- No changes to example TypeScript source (examples are already board-agnostic).

## OSS Toolchain Impact

Tang Nano 9K (GW1NR-9, Gowin) is promoted to fully supported: `synth_gowin` -> `nextpnr-himbaechel` -> `gowin_pack` -> `openFPGALoader`. The same OSS container image already supports this family. A real-board flash result must be logged in `docs/append-only-engineering-log.md` before this change is marked complete.

## Delivery Gates

- `bun run quality` passes.
- `bun run compile:example` with `--board boards/tang_nano_9k.board.json` generates correct artifacts.
- At least one successful Tang Nano 9K real-board flash logged in `docs/append-only-engineering-log.md`.
- `bun run test:uvm` passes.
- Build Agent owns CLI and types changes; Toolchain Agent owns registry, adapter, and constraint unification; QA Agent verifies board dispatch logic.
