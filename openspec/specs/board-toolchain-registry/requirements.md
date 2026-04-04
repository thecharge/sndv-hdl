# Requirements: Board Toolchain Registry

REQ-BTR-001: The toolchain package SHALL provide a `BoardRegistry` service that maps each supported `SupportedBoardId` to a factory function that constructs the appropriate `ToolchainAdapter`. The registry SHALL be the only authoritative lookup used by the CLI compile-command handler to select a toolchain adapter.

REQ-BTR-002: The compiler package SHALL expose a single `generateBoardConstraints(board: BoardDefinition, outDir: string): string` function. The two existing constraint-generation implementations SHALL be consolidated into this one function. The returned string is the path of the written constraint file.

REQ-BTR-003: `CompileRequest` SHALL include an optional `resolvedBoardId?: SupportedBoardId` field. When the CLI resolves the `--board` argument, it SHALL populate this field.

REQ-BTR-004: The CLI SHALL emit a clear error diagnostic naming the unsupported board id and exit with a non-zero code when the board `id` does not match any registered `SupportedBoardId`.
