# Board Definition Properties Reference

This is the complete reference for board-definition properties used by the compiler constraint generator.

File scope:
- `boards/*.board.json`

Model source:
- `packages/core/src/compiler/constraints/board-constraint-gen.ts`

## Top-Level Properties

### `vendor`
- Type: string enum
- Allowed: `gowin`, `xilinx`, `intel`, `lattice`
- Purpose: selects emitted constraint format and property mapping.

### `family`
- Type: string
- Purpose: board/family identifier used in output naming and metadata.

### `part`
- Type: string
- Purpose: exact FPGA part descriptor.

### `clocks`
- Type: object map
- Key: logical clock port name from generated top module
- Value shape:
  - `pin`: string package pin number
  - `freq`: string frequency, examples: `27MHz`, `100MHz`, `50000kHz`, `27000000Hz`
  - `std`: string IO standard, example: `LVCMOS33`

### `io`
- Type: object map
- Key: logical top port name (or indexed bus name like `led[0]`)
- Value shape:
  - `pin`: string package pin number
  - `std`: string IO standard
  - `drive` (optional): string drive strength number (vendor support dependent)
  - `pull` (optional): string pull mode (vendor support dependent)

## Property Semantics

### `std`
Defines IO electrical standard for the pin.

Typical Tang Nano 20K value:
- `LVCMOS33`

Vendor mapping in generated constraints:
- Gowin `.cst`: `IO_TYPE=<std>`
- Xilinx `.xdc`: `IOSTANDARD <std>`
- Intel `.qsf`: `IO_STANDARD "<std>"`
- Lattice `.lpf`: `IO_TYPE=<std>`

### `drive`
Defines output drive strength when supported by emitted format.

Common string values used in practice:
- `2`, `4`, `8`, `12`, `16`, `24`

Vendor mapping:
- Gowin `.cst`: `DRIVE=<drive>`
- Xilinx `.xdc`: `DRIVE <drive>`
- Intel `.qsf`: currently not emitted by this generator
- Lattice `.lpf`: currently not emitted by this generator

### `pull`
Defines internal pull behavior when supported.

Common values:
- `UP`, `DOWN`, `NONE`

Vendor mapping:
- Gowin `.cst`: `PULL_MODE=<pull>`
- Xilinx `.xdc`: `PULLTYPE <pull>`
- Intel `.qsf`: currently not emitted by this generator
- Lattice `.lpf`: currently not emitted by this generator

## Naming Rules
- JSON key must match generated top port name exactly.
- Bus members use indexed naming in board JSON, for example `led[0]`.
- `pin` uses package pin number, not IO alias names like `IOT27B`.

Tang Nano 20K example:
- schematic alias: `IOT27B/GCLKC_0` (Bank 0)
- board net: `PIN79_WS2812`
- board JSON: `"ws2812": { "pin": "79", ... }`

## Minimal Valid Example
```json
{
  "vendor": "gowin",
  "family": "GW2A-18C",
  "part": "GW2AR-LV18QN88C8/I7",
  "clocks": {
    "clk": { "pin": "4", "freq": "27MHz", "std": "LVCMOS33" }
  },
  "io": {
    "led[0]": { "pin": "15", "std": "LVCMOS33" },
    "ws2812": { "pin": "79", "std": "LVCMOS33", "drive": "8" }
  }
}
```
