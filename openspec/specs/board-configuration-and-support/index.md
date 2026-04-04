# board-configuration-and-support

**Owner:** Toolchain Agent, Build Agent
**Status:** Production (Tang Nano 20K, Tang Nano 9K), Constraint-gen only (Arty A7)
**Version:** Bootstrap 1.0

## Summary

Board definitions, constraint generation, and workspace configuration. Each supported
board is defined as a JSON file in `boards/` and referenced by the CLI `--board` flag.
The constraint generator (`board-constraint-gen.ts`) reads the board JSON and emits
vendor-specific physical constraint files:
- Gowin boards: `.cst` files with `IO_LOC` and `IO_PORT` directives
- Xilinx boards: `.xdc` files (constraint-gen only; no synthesis flow)

## Files

- `requirements.md` - SHALL statements for board config and constraint generation
- `constraints.md` - OSS board gating policy and format rules
- `scenarios/board-definition.md` - Acceptance scenarios for board authoring

## Board Support Status

| Board | FPGA | Synthesis | PnR | Flash | Status |
|---|---|---|---|---|---|
| Tang Nano 20K | GW2AR-18C | synth_gowin | nextpnr-himbaechel | openFPGALoader | Production |
| Tang Nano 9K | GW1NR-9C | synth_gowin | nextpnr-himbaechel | openFPGALoader | Supported |
| Arty A7 | XC7A35T | N/A | N/A | openFPGALoader | Constraint-gen only |
| DE10-Nano | Cyclone V | No OSS path | N/A | N/A | Out of scope |

## Key Source Locations

| Path | Responsibility |
|---|---|
| `boards/*.board.json` | Board definition files |
| `packages/core/src/compiler/constraints/board-constraint-gen.ts` | Constraint generator |
| `packages/config/src/` | Board definition loading and workspace config |
| `configs/workspace.config.json` | Programmer profiles and board IDs |
| `packages/types/` | `SupportedBoardId` enum |

## Tang Nano 20K Pin Reference

| Signal | Pin | Notes |
|---|---|---|
| `clk` | 4 | 27 MHz oscillator |
| `rst_n` | 88 | S1 button (active-HIGH, pull-down at rest) |
| `btn` | 87 | S2 button (active-HIGH, pull-down at rest) |
| `led[0..5]` | 15-20 | Active-LOW (0=ON, 0x3F=all off) |
| `ws2812` | 79 | WS2812 data line (3.3V LVCMOS) |
| `uart_tx` | 69 | FPGA TX -> BL616 UART RX |
| `uart_rx` | 70 | BL616 UART TX -> FPGA RX |

## Related Capabilities

- `ts-to-sv-compiler-core` - consumes board definitions to generate constraints
- `open-source-toolchain-integration` - uses constraint files during synthesis
- `cli-and-workflow-orchestration` - `--board` flag selects the active definition
