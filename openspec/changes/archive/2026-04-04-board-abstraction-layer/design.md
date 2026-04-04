## Context

The current CLI compile-to-flash path hardcodes `TangNano20kToolchainFacade` in `compile-command-handler.ts` and `TangNano20kToolchainFactory` hardcodes `SupportedBoardId.TangNano20k`. Two constraint-generation implementations exist in parallel (one in `compiler-engine.ts`, one in `board-constraint-gen.ts`). The result is that `--board boards/tang_nano_9k.board.json` generates a correctly-named constraint file (`tang_nano_9k.cst`) but then synthesises with the wrong device parameters and flashes with the wrong programmer profile.

The fix requires three coordinated changes: (1) a registry mapping board ids to toolchain factories, (2) propagation of the resolved board id through `CompileRequest` to the toolchain phase, and (3) consolidation of the two constraint generators.

## Goals / Non-Goals

**Goals:**
- `BoardRegistry` maps `SupportedBoardId` to `ToolchainAdapter` factory.
- `compile-command-handler` resolves board id from `--board` argument and uses the registry.
- `CompileRequest` carries `resolvedBoardId`.
- Unified `generateBoardConstraints` replaces the two existing implementations.
- Tang Nano 9K promoted to fully supported with logged real-board flash.

**Non-Goals:**
- New board definitions beyond Tang Nano 9K.
- GUI or API board selection.
- Example source changes.

## Decisions

**Decision: `BoardRegistry` as a simple record mapping `SupportedBoardId` to factory function**

A plain object `{ [id in SupportedBoardId]?: ToolchainAdapterFactory }` is simpler than a class-based registry and avoids circular dependency issues. Alternative (abstract factory with DI) adds unnecessary abstraction for the current two-board scope.

**Decision: Board id resolution from board JSON `id` field**

The board JSON files already contain an `id` field (e.g., `"tang_nano_20k"`). The CLI parser reads this field and maps it to `SupportedBoardId` via an explicit lookup table. This keeps the JSON as the single source of truth and avoids re-deriving the id from the file path basename.

**Decision: `generateBoardConstraints` accepts `BoardDefinition` object, not a file path**

The unified function works on an already-parsed `BoardDefinition` (same type as `board-constraint-gen.ts`). Callers that previously passed a file path now parse the JSON first. This makes the function testable in isolation and consistent with the typed API.

## Risks / Trade-offs

- **Risk: Tang Nano 9K real-board flash may require a specific programmer profile.** Until a successful flash is logged, the Tang Nano 9K must not be marked `status: "supported"` in `workspace.config.json`.
  - Mitigation: the change delivery gate requires a logged real-board flash result.
- **Risk: Removing the hardcoded `TangNano20kToolchainFacade` reference may break existing integration tests that instantiate it directly.**
  - Mitigation: keep the facade class; `compile-command-handler` uses `BoardRegistry` but the facade remains importable.
