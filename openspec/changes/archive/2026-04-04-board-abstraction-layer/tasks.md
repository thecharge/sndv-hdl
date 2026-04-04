## 1. Types Update

- [x] 1.1 In `packages/types/src/compiler.ts`, add `resolvedBoardId?: SupportedBoardId` to `CompileRequest`

## 2. Unified Constraint Generator

- [x] 2.1 Create `packages/core/src/compiler/constraints/generate-board-constraints.ts` with a single `generateBoardConstraints(board: BoardDefinition, outDir: string): string` function that consolidates the Gowin `.cst`, Xilinx `.xdc` logic from both existing implementations
- [x] 2.2 Update `packages/core/src/adapters/legacy-compiler-adapter.ts` to parse the board JSON first and call `generateBoardConstraints(boardDef, outDir)` instead of `compiler-engine.generateConstraints`
- [x] 2.3 Mark `compiler-engine.generateConstraints` as `@deprecated` with a migration comment pointing to the new function; do not delete it in this change (backward compat)

## 3. Board Registry

- [x] 3.1 Create `packages/toolchain/src/services/board-registry.ts` with a `BoardRegistry` record mapping `SupportedBoardId` to a factory function `(workspaceConfig: WorkspaceConfiguration) => ToolchainAdapter`
- [x] 3.2 Register `SupportedBoardId.TangNano20K` and `SupportedBoardId.TangNano9K` in the registry

## 4. Tang Nano 9K Toolchain Adapter

- [x] 4.1 Create `packages/toolchain/src/adapters/tang-nano-9k-toolchain-adapter.ts` modelled after the 20K adapter; use correct `pnrDevice` for GW1NR-9 and the appropriate `gowin_pack` arch
- [x] 4.2 Create `packages/toolchain/src/factories/tang-nano-9k-toolchain-factory.ts`
- [x] 4.3 Register Tang Nano 9K in `packages/config/src/constants/default-workspace-configuration.ts` with correct `pnrDevice`, `part`, and programmer profile

## 5. CLI Wiring

- [x] 5.1 In `apps/cli/src/commands/compile-command-handler.ts`, parse the board JSON file to extract the `id` field, map it to `SupportedBoardId`, populate `compileRequest.resolvedBoardId`, and use `BoardRegistry.getAdapter(resolvedBoardId)` instead of hardcoded `TangNano20kToolchainFacade`
- [x] 5.2 Emit a clear error and non-zero exit when the board `id` does not match any registered `SupportedBoardId`

## 6. Real-Board Verification

- [x] 6.1 Flash the blinker example to a Tang Nano 20K via the new board registry path to verify the abstraction layer end-to-end: `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/blinker --board boards/tang_nano_20k.board.json --out .artifacts/bal_20k_verify --flash`. Tang Nano 9K hardware not available; 9K adapter code is complete and compile-verified but hardware flash deferred.
- [x] 6.2 Append the flash command, full output, and success/failure conclusion to `docs/append-only-engineering-log.md`

## 7. Quality Gate

- [x] 7.1 Run `bun run quality` and confirm it passes
- [x] 7.2 Run `bun run test:uvm` and confirm no regressions
- [x] 7.3 Verify `bun run compile:example` with Tang Nano 20K `--board` still produces correct artifacts (no regression)
