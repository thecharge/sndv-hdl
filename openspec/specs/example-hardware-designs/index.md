# example-hardware-designs

**Owner:** All Agents (examples are collaboration points)
**Status:** Production (blinker, ws2812_demo, aurora_wave, aurora_uart, calc_uart), Supported (knight_rider, breathe, uart_echo)
**Version:** Bootstrap 1.0

## Summary

The `examples/hardware/<board>/<name>/` tree demonstrates real, synthesisable hardware
designs compiled from TypeScript and flashed to physical FPGA boards. Examples serve three
purposes:
1. **Proof of concept** — the compiler and toolchain actually work end-to-end
2. **Reference implementations** — new contributors learn from working examples
3. **Regression anchors** — compile success validates the compiler after every change

Simulation examples under `examples/<name>/` are simpler combinational designs for the
functional compiler path.

## Current Examples (Tang Nano 20K)

| Example | Path | Status | Description |
|---|---|---|---|
| blinker | `examples/hardware/tang_nano_20k/blinker/` | Confirmed flash | 6-LED sequential chaser |
| ws2812_demo | `examples/hardware/tang_nano_20k/ws2812_demo/` | Confirmed flash | WS2812 rainbow demo |
| aurora_wave | `examples/hardware/tang_nano_20k/aurora_wave/` | Confirmed flash | 8-pixel smooth rainbow |
| aurora_uart | `examples/hardware/tang_nano_20k/aurora_uart/` | Confirmed compile | Serial-controlled rainbow |
| calc_uart | `examples/hardware/tang_nano_20k/calc_uart/` | Confirmed compile | FPGA calculator over UART |
| uart_echo | `examples/hardware/tang_nano_20k/uart_echo/` | Supported | UART loopback diagnostic |
| knight_rider | `examples/hardware/tang_nano_20k/knight_rider/` | Supported | Knight Rider LED scanner |
| breathe | `examples/hardware/tang_nano_20k/breathe/` | Supported | PWM breathing LED |

## Simulation Examples

| Example | Path | Description |
|---|---|---|
| adder | `examples/adder/` | 32-bit adder (functional compiler) |
| alu | `examples/alu/` | ALU (used in UVM test) |
| uart_tx | `examples/uart_tx/` | UART transmitter (functional compiler) |

## Files

- `requirements.md` - Requirements for example quality and layout
- `constraints.md` - Layout rules, forbidden patterns, quality gates
- `scenarios/hardware-examples.md` - Acceptance scenarios

## Related Capabilities

- `ts-to-sv-compiler-core` - all examples exercise the compiler
- `uvm-style-verification` - each example should have a testbench spec
- `cli-and-workflow-orchestration` - examples are compiled via the CLI
- `board-configuration-and-support` - examples reference board definitions
