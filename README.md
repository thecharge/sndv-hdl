# ts2v

Production-grade TypeScript-to-SystemVerilog compiler and FPGA toolchain.

Write hardware in TypeScript. Compile to IEEE 1800-2017 SystemVerilog. Synthesise and flash with a 100% open-source toolchain.

Author: Radoslav Sandov

## What This Repository Delivers
- TypeScript class-style hardware source (`@Module`, `@Sequential`, `@Combinational`) compiled into standard, portable SystemVerilog.
- Board constraint generation from JSON board definitions: add your own board in minutes.
- Containerised synthesis, place-and-route, and bitstream packaging (Yosys + nextpnr + gowin_pack).
- Persistent FPGA programming using `openFPGALoader --external-flash --write-flash --verify`.
- TypeScript-native UVM-style verification: write testbench specs in TypeScript, simulate in-container.

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

The WS2812 demo cycles a connected strip through a 6-colour rainbow (GRB
order: RED, YELLOW, GREEN, CYAN, BLUE, MAGENTA) while walking the six board
LEDs. Tang Nano 20K pin 79 carries the WS2812 data line.

- S2 (pin 87) held: strip cycles colours. Released: strip goes dark.
- S1 (pin 88) held: 6 board LEDs walk one at a time. Released: all LEDs off.

Both buttons are active-high (pull-down to GND at rest, press drives pin to 3.3V).

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/ws2812_demo \
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
- [docs/guides/getting-started.md](docs/guides/getting-started.md): **newcomer onboarding, from empty folder to flashed blinker with testbench** (start here if you are new).
- [docs/quickstart.md](docs/quickstart.md): WS2812-first end-to-end quickstart with explicit pass/fail checks.
- [docs/guides/end-to-end-delivery.md](docs/guides/end-to-end-delivery.md): **step-by-step compile-to-flash delivery guide** (reference for new hardware modules).
- [docs/guides/board-definition-authoring.md](docs/guides/board-definition-authoring.md): complete board definition guide.
- [docs/guides/board-definition-properties-reference.md](docs/guides/board-definition-properties-reference.md): complete property reference (`std`, `drive`, `pull`, `freq`, vendor mappings).
- [docs/guides/tang_nano_20k_programming.md](docs/guides/tang_nano_20k_programming.md): Tang Nano 20K flashing runbook.
- [docs/guides/debugging-and-troubleshooting.md](docs/guides/debugging-and-troubleshooting.md): end-to-end debug flow and failure signatures.
- [docs/guides/production-reality-check.md](docs/guides/production-reality-check.md): production acceptance workflow with proof commands.
- [docs/guides/programmer-profiles-and-usb-permissions.md](docs/guides/programmer-profiles-and-usb-permissions.md): profile and permission model.
- [docs/guides/user-usb-debugger-onboarding.md](docs/guides/user-usb-debugger-onboarding.md): practical USB probe onboarding.
- [docs/guides/examples-matrix.md](docs/guides/examples-matrix.md): examples, intent, and expected hardware behavior.
- [docs/guides/uvm-simulation-with-podman.md](docs/guides/uvm-simulation-with-podman.md): containerized simple UVM-style simulation flow.
- [docs/guides/uvm-suite-authoring.md](docs/guides/uvm-suite-authoring.md): how to add future UVM-style verification suites and reports.
- [docs/guides/ws2812-protocol-and-brightness.md](docs/guides/ws2812-protocol-and-brightness.md): WS2812 protocol semantics and brightness behavior.
- [docs/development.md](docs/development.md): contributor/developer workflow.
- [docs/hardware-toolchain.md](docs/hardware-toolchain.md): synth/programming architecture and command flow.
- [docs/architecture.md](docs/architecture.md): system architecture with Mermaid diagrams.
- [docs/specification.md](docs/specification.md): language and generation spec.
- [docs/compliance.md](docs/compliance.md): standards and subset compliance.
- [docs/qa-testing.md](docs/qa-testing.md): test strategy and quality gates.
- [docs/package-inventory.md](docs/package-inventory.md): package boundaries and responsibilities.
- [docs/security-compliance.md](docs/security-compliance.md): repository compliance and security posture.
- [docs/append-only-engineering-log.md](docs/append-only-engineering-log.md): append-only operational log.
- [cpu/README_ASSEMBLY.md](cpu/README_ASSEMBLY.md): nibble4 CPU architecture and assembly guide.

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
  - `examples/hardware/tang_nano_20k/blinker/`: 6-LED chaser (hardware baseline)
  - `examples/hardware/tang_nano_20k/ws2812_demo/`: WS2812 interactive demo (flagship, confirmed flashed)
  - `examples/adder/`, `examples/alu/`, `examples/uart_tx/`, etc.: simulation examples
- `testbenches/uvm/`: UVM-style testbench specs (TypeScript) compiled to SV for simulation.

## License
MIT. See `LICENSE`.

## Authors
See `AUTHORS.md`.
