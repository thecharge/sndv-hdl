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

## Installation

Install the runtime package to write synthesisable TypeScript hardware modules by cloning this repository

> For the full hardware toolchain (synthesis, place-and-route, and FPGA flashing), clone the repository and follow the [getting started guide](docs/guides/getting-started.md).

---

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

## Quickstart: Aurora Wave - 8-Pixel Rainbow Demo

Drives an 8-LED WS2812 strip with a slowly rotating rainbow. Every pixel is always on,
each showing a different colour, so the strip looks like a full rainbow at once.
Hold S2 (pin 87) for 8x speed.

WS2812 data line: pin 79. No external strip? The onboard WS2812C-2020 shows pixel 0.

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/aurora_wave \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/aurora_wave \
  --flash
```

## Quickstart: Aurora UART - Rainbow You Can Control Over Serial

Same rainbow as aurora_wave, but you can change colours and speed live from your PC
over USB serial. Flash and run with the included scripts:

```bash
./examples/hardware/tang_nano_20k/aurora_uart/flash.sh
./examples/hardware/tang_nano_20k/aurora_uart/run.sh
```

Commands: `a`=aurora `r`=red `g`=green `b`=blue `f`=faster `s`=slower `x`=freeze `q`=quit.
The FPGA replies `K` after every command it understands.

See [examples/hardware/tang_nano_20k/aurora_uart/README.md](examples/hardware/tang_nano_20k/aurora_uart/README.md) for full details.

## Quickstart: Calc UART - Calculator Running on the FPGA

Send two numbers and an operation to the FPGA over USB serial. The FPGA computes
the result in hardware and sends it back. The client uses JSON.

```bash
./examples/hardware/tang_nano_20k/calc_uart/flash.sh
./examples/hardware/tang_nano_20k/calc_uart/run.sh
```

```
> {"op": "add", "a": 42, "b": 13}
{"op":"add","a":42,"b":13,"result":55,"hex":"0x0037","ms":2}
```

Operations: `add`, `sub`, `mul`. Operands: 0-255. Result: 16-bit.

See [examples/hardware/tang_nano_20k/calc_uart/README.md](examples/hardware/tang_nano_20k/calc_uart/README.md) for full details.

---

See [docs/guides/examples-matrix.md](docs/guides/examples-matrix.md) for the full examples list.

## Core Commands
- `bun run quality`: typecheck + lint + test + build.
- `bun run test:root`: run focused root regression suite (`tests/class-compiler.test.ts`).
- `bun run test:uvm`: compile `examples/alu/alu.ts` and `examples/hardware/tang_nano_20k/blinker/blinker.ts`, generate UVM-style benches from TypeScript specs, run simulation in Podman/Docker, and emit per-suite reports (`.artifacts/uvm/reports/*.json|*.md`).
- `bun run toolchain:image:build`: build local synth/flash image.
- `bun run compile:example`: compile default example.
- `bun run flash:tang20k <bitstream.fs>`: direct flash helper entrypoint.

## Documentation Index
- [docs/guides/getting-started.md](docs/guides/getting-started.md): **newcomer onboarding, from empty folder to flashed blinker with testbench** (start here if you are new).
- [docs/guides/runtime-api.md](docs/guides/runtime-api.md): **runtime API reference** - all decorators, hardware types (`Logic`, `Bit`, `LogicArray`), `HardwareModule`, `Bits` namespace, recommended tsconfig, multi-file patterns.
- [docs/quickstart.md](docs/quickstart.md): WS2812-first end-to-end quickstart with explicit pass/fail checks.
- [docs/guides/end-to-end-delivery.md](docs/guides/end-to-end-delivery.md): **step-by-step compile-to-flash delivery guide** (reference for new hardware modules).
- [docs/guides/board-definition-authoring.md](docs/guides/board-definition-authoring.md): complete board definition guide.
- [docs/guides/board-definition-properties-reference.md](docs/guides/board-definition-properties-reference.md): complete property reference (`std`, `drive`, `pull`, `freq`, vendor mappings).
- [docs/guides/tang_nano_20k_programming.md](docs/guides/tang_nano_20k_programming.md): Tang Nano 20K flashing runbook.
- [docs/guides/debugging-and-troubleshooting.md](docs/guides/debugging-and-troubleshooting.md): end-to-end debug flow and failure signatures.
- [docs/guides/production-reality-check.md](docs/guides/production-reality-check.md): production acceptance workflow with proof commands.
- [docs/production-readiness.md](docs/production-readiness.md): **production analysis** - compiler status, WS2812 timing verification, known limitations, disclaimers.
- [docs/guides/programmer-profiles-and-usb-permissions.md](docs/guides/programmer-profiles-and-usb-permissions.md): profile and permission model.
- [docs/guides/user-usb-debugger-onboarding.md](docs/guides/user-usb-debugger-onboarding.md): practical USB probe onboarding.
- [docs/guides/uart-serial-debugging.md](docs/guides/uart-serial-debugging.md): **UART and serial port debugging** - find correct ttyUSB port, test hardware with Python, stty configuration, Bun serial I/O patterns, Tang Nano board references.
- [docs/guides/examples-matrix.md](docs/guides/examples-matrix.md): examples, intent, and expected hardware behavior.
- [docs/guides/uvm-simulation-with-podman.md](docs/guides/uvm-simulation-with-podman.md): containerized simple UVM-style simulation flow.
- [docs/guides/uvm-suite-authoring.md](docs/guides/uvm-suite-authoring.md): how to add future UVM-style verification suites and reports.
- [docs/guides/ws2812-protocol-and-brightness.md](docs/guides/ws2812-protocol-and-brightness.md): WS2812 protocol semantics and brightness behavior.
- [docs/guides/ws2812-debug-guide.md](docs/guides/ws2812-debug-guide.md): **WS2812 NeoPixel debug guide** - protocol root causes, chip variant timing (WS2812B vs WS2812C-2020), oscilloscope verification checklist.
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
- [CLAUDE.md](CLAUDE.md): **AI/LLM project context** - supported TypeScript subset, compiler limitations, workarounds, DX guidance for human and AI contributors.
- [docs/release-notes-aurora-wave.md](docs/release-notes-aurora-wave.md): Aurora wave demo release notes - design patterns, compiler fix, gap list, social caption.

## Repository Layout
- `apps/cli`: CLI argument parsing and command handlers.
- `packages/core`: compiler facade and legacy adapter wrapper.
- `packages/runtime`: decorators and TS-side hardware types.
- `packages/toolchain`: synthesis and flashing adapters.
- `packages/config`: workspace and board config services.
- `packages/process`: process runtime abstraction.
- `packages/types`: shared interfaces/contracts.
- `boards`: board definitions used by compile/flash flow.
- `examples/`: hardware examples for Tang Nano 20K and simulation.
  - `examples/hardware/tang_nano_20k/blinker/`: 6-LED chaser (good first test)
  - `examples/hardware/tang_nano_20k/ws2812_demo/`: WS2812 rainbow - see [ws2812-debug-guide.md](docs/guides/ws2812-debug-guide.md)
  - `examples/hardware/tang_nano_20k/aurora_wave/`: 8-pixel smooth rainbow, no PC needed
  - `examples/hardware/tang_nano_20k/aurora_uart/hw/`: Aurora rainbow with live serial control - see [README](examples/hardware/tang_nano_20k/aurora_uart/README.md)
  - `examples/hardware/tang_nano_20k/calc_uart/hw/`: FPGA calculator over serial (JSON in, JSON out) - see [README](examples/hardware/tang_nano_20k/calc_uart/README.md)
  - `examples/hardware/tang_nano_20k/uart_echo/`: UART loopback diagnostic - echoes received bytes back (use this to verify TX/RX pins and port number)
  - `examples/hardware/tang_nano_20k/knight_rider/`: Knight Rider LED scanner
  - `examples/hardware/tang_nano_20k/breathe/`: Breathing LED (PWM submodule demo)
  - `examples/adder/`, `examples/alu/`, `examples/uart_tx/`: simulation examples
- `testbenches/uvm/`: UVM-style testbench specs (TypeScript) compiled to SV for simulation.

## Hardware Warnings

> **WS2812 chip variant reset requirement**: The on-board WS2812C-2020 (Tang Nano 20K pin 79) requires T_RESET > 280 µs. The commonly-cited 50 µs value applies only to WS2812B strips. Using 50 µs reset will cause the LED to silently do nothing. The serialiser in this repo uses 370 µs (10 000 clocks at 27 MHz).

> **3.3 V logic vs 5 V WS2812B strips**: FPGA GPIO outputs 3.3 V. External 5 V WS2812B strips may require a 74AHCT125 level shifter on the data line for reliable operation. The on-board LED works directly at 3.3 V.

> **Confirmed flash status scope**: The `ws2812_demo` confirmed-flash status reflects the on-board LED only. External strip behavior depends on your power supply, level shifting, and the exact WS2812 variant in use.

> **Open-source toolchain only**: This project targets Yosys + nextpnr exclusively. No Quartus, Vivado, or Gowin EDA proprietary bits are required. The Arty A7 board definition generates `.xdc` constraint files but has no synthesis flow - constraint output only until a fully self-contained OSS path exists for Xilinx 7-series.

## License
MIT. See `LICENSE`.

## Authors
See `AUTHORS.md`.
