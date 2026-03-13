# ts2v Production Workspace

Production-grade TypeScript-to-SystemVerilog compiler and FPGA flow for Tang Nano boards.

Author: Radoslav Sandov

## What This Repository Delivers
- TypeScript class-style hardware source (`@Module`, `@Sequential`, `@Combinational`) compiled into SystemVerilog.
- Board constraint generation from JSON board definitions.
- Containerized synthesis, place-and-route, and bitstream packaging.
- Persistent FPGA programming using `openFPGALoader --external-flash --write-flash --verify`.

## Quickstart From Zero To Blinky
Use this exact sequence on Linux.

### 1. Install Prerequisites
- Bun 1.3+
- Podman or Docker
- Git
- USB access to your board programmer

### 2. Install Dependencies
```bash
bun install
```

### 3. Build Toolchain Image
```bash
bun run toolchain:image:build
```

### 4. Validate Workspace Quality
```bash
bun run quality
```

### 5. Put Board Into Programming Mode
Use the Tang Nano 20K board workflow (buttons/switches per board manual), then verify USB probe visibility.

```bash
lsusb
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```

### 6. Compile And Flash Blinky (Persistent)

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/blinker/blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/blinker \
  --flash
```

Confirmed flash output (Winbond W25Q64, Tang Nano 20K):

```
Detected: Winbond W25Q64 128 sectors size: 64Mb
Writing:  [==================================================] 100.00%  Done
Verifying write ... Reading: [==================================================] Done
```

### 7. Power Cycle And Recheck
Power off/on the board. Behavior should persist because image was written to external flash.

## Quickstart From Zero To WS2812 Interactive Demo

The WS2812 interactive demo features 4 color modes (rainbow, fire, ocean, forest), a 6-LED walking pattern that runs simultaneously, and hardware button debounce for mode cycling. WS2812 strip must be connected to pin 79 (Tang Nano 20K).

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/ws2812_demo/ws2812_demo.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/ws2812_demo \
  --flash
```

This demo has been confirmed flashed to a Tang Nano 20K (Winbond W25Q64).

## Core Commands
- `bun run quality`: typecheck + lint + test + build.
- `bun run test:root`: run focused root regression suite (`tests/class-compiler.test.ts`).
- `bun run test:uvm`: compile `examples/alu/alu.ts` and `examples/hardware/tang_nano_20k/blinker/blinker.ts`, generate UVM-style benches from TypeScript specs, run simulation in Podman/Docker, and emit per-suite reports (`.artifacts/uvm/reports/*.json|*.md`).
- `bun run toolchain:image:build`: build local synth/flash image.
- `bun run compile:example`: compile default example.
- `bun run flash:tang20k <bitstream.fs>`: direct flash helper entrypoint.

## Documentation Index
- `docs/quickstart.md`: WS2812-first end-to-end quickstart with explicit pass/fail checks.
- `docs/guides/end-to-end-delivery.md`: **step-by-step compile-to-flash delivery guide** (start here for new hardware modules).
- `docs/guides/board-definition-authoring.md`: complete board definition guide.
- `docs/guides/board-definition-properties-reference.md`: complete property reference (`std`, `drive`, `pull`, `freq`, vendor mappings).
- `docs/guides/tang_nano_20k_programming.md`: Tang Nano 20K flashing runbook.
- `docs/guides/debugging-and-troubleshooting.md`: end-to-end debug flow and failure signatures.
- `docs/guides/production-reality-check.md`: production acceptance workflow with proof commands.
- `docs/guides/programmer-profiles-and-usb-permissions.md`: profile and permission model.
- `docs/guides/user-usb-debugger-onboarding.md`: practical USB probe onboarding.
- `docs/guides/examples-matrix.md`: examples, intent, and expected hardware behavior.
- `docs/guides/uvm-simulation-with-podman.md`: containerized simple UVM-style simulation flow.
- `docs/guides/uvm-suite-authoring.md`: how to add future UVM-style verification suites and reports.
- `docs/guides/ws2812-protocol-and-brightness.md`: WS2812 protocol semantics and brightness behavior.
- `docs/development.md`: contributor/developer workflow.
- `docs/hardware-toolchain.md`: synth/programming architecture and command flow.
- `docs/architecture.md`: system architecture with Mermaid diagrams.
- `docs/specification.md`: language and generation spec.
- `docs/compliance.md`: standards and subset compliance.
- `docs/qa-testing.md`: test strategy and quality gates.
- `docs/package-inventory.md`: package boundaries and responsibilities.
- `docs/security-compliance.md`: repository compliance and security posture.
- `docs/append-only-engineering-log.md`: append-only operational log.
- `cpu/README_ASSEMBLY.md`: nibble4 CPU architecture and assembly guide.

## Repository Layout
- `apps/cli`: CLI argument parsing and command handlers.
- `packages/core`: compiler facade and legacy adapter wrapper.
- `packages/runtime`: decorators and TS-side hardware types.
- `packages/toolchain`: synthesis and flashing adapters.
- `packages/config`: workspace and board config services.
- `packages/process`: process runtime abstraction.
- `packages/types`: shared interfaces/contracts.
- `boards`: board definitions used by compile/flash flow.
- `examples/`: hardware examples organized by name, each subfolder contains its TypeScript source and a SystemVerilog testbench.
  - `examples/hardware/tang_nano_20k/blinker/` — 6-LED chaser (hardware baseline)
  - `examples/hardware/tang_nano_20k/ws2812_demo/` — WS2812 interactive demo (flagship, confirmed flashed)
  - `examples/adder/`, `examples/alu/`, `examples/uart_tx/`, etc. — simulation examples
- `testbenches/uvm/`: UVM-style testbench specs (TypeScript) compiled to SV for simulation.

## License
MIT. See `LICENSE`.

## Authors
See `AUTHORS.md`.
