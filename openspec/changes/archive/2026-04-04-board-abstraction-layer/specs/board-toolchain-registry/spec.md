## ADDED Requirements

### Requirement: BoardRegistry maps board id to toolchain adapter factory
The toolchain package SHALL provide a `BoardRegistry` service that maps each supported `SupportedBoardId` to a factory function that constructs the appropriate `ToolchainAdapter`. The registry SHALL be the only authoritative lookup used by the CLI compile-command handler to select a toolchain adapter.

#### Scenario: Registry returns correct adapter for Tang Nano 20K
- **WHEN** the CLI resolves `--board boards/tang_nano_20k.board.json` to `SupportedBoardId.TangNano20k`
- **THEN** `BoardRegistry.getAdapter(SupportedBoardId.TangNano20k)` returns a `TangNano20kToolchainAdapter` instance configured with the correct `pnrDevice`, programmer profile, and constraint file name

#### Scenario: Registry returns correct adapter for Tang Nano 9K
- **WHEN** the CLI resolves `--board boards/tang_nano_9k.board.json` to `SupportedBoardId.TangNano9K`
- **THEN** `BoardRegistry.getAdapter(SupportedBoardId.TangNano9K)` returns a `TangNano9KToolchainAdapter` instance

#### Scenario: Registry throws for unsupported board
- **WHEN** the CLI receives a `--board` argument whose `id` field does not match any registered `SupportedBoardId`
- **THEN** the CLI emits an error diagnostic naming the unsupported board id and exits with a non-zero code

### Requirement: Unified board constraint generator
The compiler package SHALL expose a single `generateBoardConstraints(board: BoardDefinition, outDir: string): string` function. The two existing constraint-generation implementations (in `compiler-engine.ts` and `board-constraint-gen.ts`) SHALL be consolidated into this one function. The returned string is the path of the written constraint file.

#### Scenario: Constraint file is written to output directory
- **WHEN** `generateBoardConstraints` is called with a parsed `BoardDefinition` for Tang Nano 20K and a writable output directory
- **THEN** a file named `tang_nano_20k.cst` is written in the output directory containing `IO_LOC` and `IO_PORT` lines for each port in the board definition

#### Scenario: Xilinx board produces XDC constraint file
- **WHEN** `generateBoardConstraints` is called with a `BoardDefinition` where `vendor` is `"xilinx"`
- **THEN** a file named `<board_id>.xdc` is written

## MODIFIED Requirements

### Requirement: CompileRequest carries resolved board identity
`CompileRequest` SHALL include an optional `resolvedBoardId?: SupportedBoardId` field. When the CLI resolves the `--board` argument, it SHALL populate this field. The toolchain phase SHALL prefer `resolvedBoardId` over re-deriving the board identity from the JSON path.

#### Scenario: CLI populates resolvedBoardId
- **WHEN** the user passes `--board boards/tang_nano_9k.board.json` to the CLI
- **THEN** `CompileRequest.resolvedBoardId` is `SupportedBoardId.TangNano9K`

### Requirement: Tang Nano 9K is a fully-supported board
The `SupportedBoardId.TangNano9K` entry in workspace configuration SHALL have a complete synthesis, place-and-route, pack, and flash path using the OSS toolchain (`synth_gowin` -> `nextpnr-himbaechel` -> `gowin_pack` -> `openFPGALoader`). A real-board flash MUST be logged in `docs/append-only-engineering-log.md` before this requirement is considered satisfied.

#### Scenario: Tang Nano 9K end-to-end compile and flash succeeds
- **WHEN** the user runs `bun run apps/cli/src/index.ts compile <example> --board boards/tang_nano_9k.board.json --out <dir> --flash`
- **THEN** synthesis, place-and-route, pack, and flash all succeed and the design runs on the board
