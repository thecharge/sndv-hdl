# AGENTS

## Purpose
This workspace is organized for production-grade TypeScript-to-SystemVerilog delivery with Bun and Turborepo.

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
