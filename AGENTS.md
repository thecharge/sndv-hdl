# AGENTS

## Purpose
This workspace is organized for production-grade TypeScript-to-SystemVerilog delivery with Bun and Turborepo.
The project targets real FPGA hardware via an exclusively open-source toolchain (Yosys, nextpnr, openFPGALoader).
No closed-source EDA tools (Quartus, Vivado, Gowin EDA proprietary bits beyond pack) are in scope.

## Agent Roles
- Build Agent: maintains Bun/Turbo scripts and package boundaries.
- Compiler Agent: owns TypeScript parser/typechecker/codegen behavior.
- Toolchain Agent: owns board synthesis/programming adapters and runtime fallback.
- QA Agent: owns test matrix, linting, and production readiness checks.
- Documentation Agent: owns operational docs, compliance notes, and append-only logs.

## Ownership Boundaries
- `apps/cli/*`: Build Agent + Toolchain Agent.
- `packages/core/*`: Compiler Agent.
- `packages/toolchain/*`: Toolchain Agent.
- `packages/config/*`: Build Agent + Toolchain Agent.
- `packages/types/*`: Build Agent.
- `docs/*`: Documentation Agent.

## Open-Source-Only Board Support Policy
- **Hard requirement**: every supported board must have a complete end-to-end open-source toolchain:
  synthesis (Yosys), place-and-route (nextpnr family), bitstream pack, and programming (openFPGALoader).
- **Currently fully supported (OSS end-to-end)**:
  - Tang Nano 20K (GW2AR-18, Gowin): Yosys `synth_gowin` -> `nextpnr-himbaechel` -> `gowin_pack` -> `openFPGALoader`
  - Tang Nano 9K (GW1NR-9, Gowin): same toolchain family
- **Constraint-gen only (no synthesis flow)**:
  - Arty A7 (Xilinx Artix-7): `.xdc` constraint files are generated, but `nextpnr-xilinx` still requires xray DB from Vivado; synthesis flow not in scope until a fully self-contained OSS solution exists.
- **Out of scope (no viable OSS toolchain)**:
  - DE10-Nano (Intel Cyclone V): requires Quartus; no viable open-source synthesis path.
  - Any board requiring closed-source bitstream tools.
- Never add a board to `configs/workspace.config.json` or `packages/types` `SupportedBoardId` unless it has a verified end-to-end OSS path.

## Handoff Contract
- Every code change must include:
	- purpose summary
	- validation command list
	- known residual risks
- Toolchain changes must include at least one command log proving behavior.
- Verification-flow changes should include at least one `bun run test:uvm` command log.
- Verification-flow changes should update `docs/guides/uvm-suite-authoring.md` when workflow conventions evolve.
- Documentation changes must be mirrored in `README.md` docs index.

## Working Rules
- No god objects and avoid oversized files.
- Use explicit names and avoid ambiguous shorthand.
- Keep board-specific logic behind adapter interfaces.
- Keep process execution behind command + facade boundaries.
- Document every operational or architectural decision in append-only logs.
- Generated SystemVerilog must comply with IEEE 1800-2017; use `logic` (not `wire`) for all signal declarations; input ports are `input logic`, not `input wire logic`.
- After any change to `packages/core/` source, run `bun run build` before compiling examples - stale dist files cause silent failures.
- Hardware examples live under `examples/hardware/<board>/`. Each example gets its own subfamily folder with the TypeScript source only. Do not place hardware examples at the root of `examples/`.
- Simulation examples live under `examples/<name>/` with the TypeScript source only. Do not use flat `examples/*.ts` files.
- **All testbench source must be TypeScript** - use the spec types in `testbenches/tb-spec-types.ts` and place specs in `testbenches/`. Never write raw `.sv` testbench files. Generated SV testbenches are build artifacts (`.artifacts/`) not source files.
- CPU and SoC TypeScript sources live under `examples/cpu/`. Their imports must use `'@ts2v/runtime'`, not the old `'ts2sv'` alias.
- The verified flash command for Tang Nano 20K is `bun run apps/cli/src/index.ts compile <file> --board boards/tang_nano_20k.board.json --out <dir> --flash`. No manual docker/podman orchestration required.

## Documentation Rules
- All flow, architecture, and pipeline diagrams in `docs/` must use Mermaid (` ```mermaid ` block). No ASCII art or plain-text diagrams.
- When updating a feature or workflow, update the relevant guide and mirror the change in `README.md` docs index.
- Every new guide added to `docs/guides/` must be referenced in `README.md` under Documentation Index.
- Append all hardware operational decisions (flash results, programmer profiles, new board support) to `docs/append-only-engineering-log.md`.

## Debugging Rules
- Never assume one programmer cable/profile fits all devices.
- Always run probe discovery (`lsusb`, `openFPGALoader --scan-usb`) before flash conclusions.
- Treat host USB permission and container USB permission as separate checks.
- Capture exact failure signatures in docs and logs.

## Release Readiness Rules
- Do not mark hardware flow production-ready unless at least one real-board flash is reproducible.
- Keep per-board programmer profiles in workspace config with explicit cable and VID/PID when needed.
- Record successful board/probe profile combinations in append-only log.

## Delivery Gates
- `bun run quality` must pass.
- `bun run compile:example` must generate artifacts.
- `bun run test:uvm` should pass for verification-flow updates.
- Hardware steps must be reproducible with logged commands and outputs.

## Forbidden Patterns

Never introduce any of the following in source, tests, or documentation.

### Comments
- `// -- Label -----` separator comments (any combination of em-dashes or box-drawing characters)
- JSDoc-style block comments on internal functions that do not add information beyond the function name

### Typography in prose and source comments
- Unicode arrow `->` must be written as `->`. Never use `→`.
- Em-dash ` - ` must be written as ` - ` (hyphen-minus). Never use `—` or `--` as an em-dash substitute.
- Any other non-ASCII typographic symbol in source comments or Markdown prose.

### Documentation
- `ts2v compile ...` or `ts2v build ...` as a command in docs or comments. The CLI has no global install. Use `bun run apps/cli/src/index.ts compile ...`.
- Mermaid node labels using `→`. Use `->` inside quoted labels: `["A -> B"]`.

### Hardware source (.ts examples)
- Ternary operator `?:` - the class compiler does not support it.
- `let` or `var` at module level - use `const` for module-level values.
- Hardcoded magic numbers in sequential or combinational logic - define a `const` at the top of the file.
- `wire` in generated or hand-written SV - use `logic`.
- `input wire logic` port style - use `input logic`.
- `'ts2sv'` import alias - use `'@ts2v/runtime'`.

### Examples layout
- Flat `examples/*.ts` files. Every example must live in its own subfolder.
- Hardware examples outside `examples/hardware/<board>/<name>/`.
- Raw `.sv` testbench files in `testbenches/` - write TypeScript specs only.
- Multi-file designs compiled by passing a single `.ts` file path. Pass the directory.

## Legal And Attribution
- Project license: MIT (`LICENSE`).
- Author attribution: `AUTHORS.md`.

