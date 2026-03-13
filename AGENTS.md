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
  - Tang Nano 20K (GW2AR-18, Gowin): Yosys `synth_gowin` → `nextpnr-himbaechel` → `gowin_pack` → `openFPGALoader`
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
- After any change to `packages/core/` source, run `bun run build` before compiling examples — stale dist files cause silent failures.
- Hardware examples live under `examples/hardware/<board>/`. Each example gets its own subfamily folder with both the TypeScript source and a `.sv` testbench. Do not place hardware examples at the root of `examples/`.
- Simulation examples live under `examples/<name>/` with their `.sv` testbenches co-located. Do not use flat `examples/*.ts` files.
- The verified flash command for Tang Nano 20K is `bun run apps/cli/src/index.ts compile <file> --board boards/tang_nano_20k.board.json --out <dir> --flash`. No manual docker/podman orchestration required.

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

## Legal And Attribution
- Project license: MIT (`LICENSE`).
- Author attribution: `AUTHORS.md`.

