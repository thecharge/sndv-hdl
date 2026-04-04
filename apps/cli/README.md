# @ts2v/cli

Command-line interface for ts2v - the TypeScript-to-SystemVerilog compiler and FPGA toolchain.

Compiles TypeScript hardware modules to IEEE 1800-2017 SystemVerilog and flashes them to FPGA boards using a 100% open-source toolchain (Yosys + nextpnr + gowin_pack + openFPGALoader).

## Installation

```bash
# Global install
npm install -g @ts2v/cli
# or
bun add -g @ts2v/cli
```

> **Note**: The CLI requires the OSS synthesis toolchain container. See [Container Setup](#container-setup) below.

## Usage

```bash
# Compile a hardware module to SystemVerilog
bun run apps/cli/src/index.ts compile <file-or-directory> \
  --board <board.json> \
  --out <output-directory>

# Compile and flash to FPGA (persistent flash)
bun run apps/cli/src/index.ts compile <file-or-directory> \
  --board <board.json> \
  --out <output-directory> \
  --flash

# Compile with JSON diagnostics output (machine-readable errors)
bun run apps/cli/src/index.ts compile <file-or-directory> \
  --board <board.json> \
  --out <output-directory> \
  --diagnostics=json
```

### Multi-file Designs

Always pass the directory, not a single file, for designs with multiple modules:

```bash
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/calc_uart/hw \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/calc_uart \
  --flash
```

## Supported Boards

| Board | Chip | Synthesis Flow |
|---|---|---|
| Tang Nano 20K | GW2AR-18C (Gowin) | Yosys `synth_gowin` -> `nextpnr-himbaechel` -> `gowin_pack` -> `openFPGALoader` |
| Tang Nano 9K | GW1NR-9 (Gowin) | Same toolchain family |

Board definitions are JSON files in `boards/`. Add your own by following the [board authoring guide](../../docs/guides/board-definition-authoring.md).

## Container Setup

The synthesis flow requires the OSS toolchain container image:

```bash
# One-time build (requires Podman or Docker)
bun run toolchain:image:build

# Verify your board is visible
lsusb
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```

No Quartus, Vivado, or proprietary Gowin EDA tools required.

## Diagnostics Flag

Use `--diagnostics=json` to get machine-readable output:

```bash
bun run apps/cli/src/index.ts compile src/ --board boards/tang_nano_20k.board.json \
  --out out/ --diagnostics=json
```

Output (one JSON object per line):

```json
{"severity":"error","code":"TS2V-2000","message":"Unsupported syntax: ternary operator","location":{"filePath":"src/module.ts","line":42,"column":10}}
```

## License

MIT. See [LICENSE](../../LICENSE).
