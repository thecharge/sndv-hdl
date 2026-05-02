## Why

ts2v can synthesise single-clock hardware today, but real designs require multiple asynchronous clock domains (e.g., a 27 MHz system clock alongside a 48 MHz USB PHY clock or a pixel clock for HDMI). Without first-class multiclock support, safe clock-domain crossings cannot be expressed in TypeScript or verified by the compiler. Simultaneously, every user who wants SPI, I2C, UART, USB, CAN/TWAI, or HDMI must write the protocol stack from scratch - a high barrier that limits adoption. The developer ergonomics also need improvement: the current decorator API is low-level and unfamiliar to TypeScript developers coming from software backgrounds. This change addresses all three gaps in one cohesive platform release.

## What Changes

- **Multiclock domain support in the compiler**: introduce `@ClockDomain` decorator and a `ClockDomainCrossing` synchroniser primitive; the compiler tracks domain membership and emits CDC synchronisers (two-FF, FIFO-based) with optional timing-constraint output for nextpnr.
- **Standard protocol library (`@ts2v/stdlib`)**: new package containing reusable, synthesisable TypeScript modules for I2C, I3C, SPI, UART, USB (Full-Speed device), CAN/TWAI, PWM, one-wire, WS2812/NeoPixel, VGA, and HDMI (DVI-compatible); each protocol module is independently importable.
- **Ergonomics layer**: higher-level helper types and functions (`SignalBus`, `Reg`, `Edge`, `rising`, `falling`, clock-edge guards) that make hardware description feel closer to idiomatic TypeScript; remove the need to use raw `@Sequential`/`@Combinational` in simple cases via a new `@Hardware` shorthand.
- **Expanded examples**: one end-to-end hardware example per new protocol on Tang Nano 20K; at least two multiclock examples; an HDMI "Hello World" video output example.
- **Formal verification integration**: compiler support for `@Assert` and `@Assume` decorators that emit SystemVerilog Assertions (SVA); integration with an OSS model checker (SymbiYosys) to run bounded model checking on designs from TypeScript specs.
- **Nimble processor example**: the existing nibble4 multi-core 4-bit CPU (TypeScript source in `cpu/ts/`) promoted to a first-class example under `examples/cpu/nibble4/`, compiled and verified end-to-end with the ts2v toolchain and a UVM testbench spec.
- **Test coverage expansion**: unit tests for every new compiler pass, UVM-style testbench specs for every stdlib protocol module, and a coverage report gate in CI.
- **Documentation and README polish**: updated architecture diagram, per-protocol guides, updated quick-start, and a migration guide for the ergonomics changes.

## Capabilities

### New Capabilities

- `multiclock-domain-support`: Compiler-level tracking of clock domains, `@ClockDomain` decorator, `ClockDomainCrossing` primitives, and CDC synchroniser emission; optionally produces nextpnr timing constraint files.
- `stdlib-protocol-library`: New `@ts2v/stdlib` package with synthesisable modules for I2C, I3C, SPI (controller + peripheral), UART, USB Full-Speed device, CAN/TWAI, PWM, one-wire, WS2812, VGA, and HDMI/DVI output.
- `ergonomics-improvements`: `SignalBus`, `Reg`, `Edge`, `rising`/`falling` helpers; `@Hardware` shorthand decorator; improved TypeScript type inference for `LogicArray` widths; error messages with source-location context.
- `stdlib-examples`: Hardware examples for each new protocol targeting Tang Nano 20K; multiclock domain crossing examples; HDMI video output example.
- `test-coverage-expansion`: Compiler pass unit tests, UVM testbench specs for all stdlib modules, coverage report generation and CI gate.
- `formal-verification`: `@Assert` / `@Assume` decorator support in the compiler emitting SVA; SymbiYosys integration for bounded model checking invocable via `bun run verify`; TypeScript-level property specification API.
- `nimble-processor-example`: nibble4 CPU TypeScript source moved to `examples/cpu/nibble4/`, compiled end-to-end with ts2v, flashed to Tang Nano 20K, and covered by a UVM testbench spec.
- `matrix-multiply-uart`: FPGA hardware matrix multiplier (4x4, 8-bit integer) with UART interface, `flash.sh` / `run.sh` scripts, and a Bun CLI client in `examples/hardware/tang_nano_20k/matrix_uart/`, structured identically to calc_uart.
- `tpu-uart`: FPGA hardware tensor processing unit (4-element dot-product, accumulate, ReLU) with UART interface, `flash.sh` / `run.sh` scripts, and a Bun CLI client in `examples/hardware/tang_nano_20k/tpu_uart/`, structured identically to calc_uart.

### Modified Capabilities

- `ts-to-sv-compiler-core`: Requires new AST annotation pass for clock-domain membership; code-generation pass updated to emit CDC synchronisers and multi-clock `always_ff` blocks with correct sensitivity lists.
- `ts-developer-experience`: Ergonomics helpers extend and refine the existing decorator and runtime API contract; the `@Hardware` shorthand is additive but the helper types constrain some previously open signatures.
- `uvm-style-verification`: Coverage report generation and CI gate added; no scenario-level requirement change, only infrastructure addition.

## Impact

- **packages/core**: New compiler passes (clock-domain analysis, CDC emission); codegen updated for multi-clock `always_ff`.
- **packages/runtime**: New decorators (`@ClockDomain`, `@Hardware`) and helper types exported.
- **examples/hardware/tang_nano_20k/matrix_uart/**: 4x4 8-bit integer matrix multiplier over UART with `hw/`, `client/`, `flash.sh`, `run.sh`, README.
- **examples/hardware/tang_nano_20k/tpu_uart/**: 4-element dot-product / accumulate / ReLU TPU over UART with `hw/`, `client/`, `flash.sh`, `run.sh`, README.
- **examples/cpu/nibble4/**: nibble4 multi-core CPU example promoted from `cpu/ts/` to proper examples layout; flashed on Tang Nano 20K.
- **New package packages/stdlib**: All protocol library modules.
- **apps/cli**: No breaking API changes; `--clock-constraints` flag added for nextpnr constraint file output; `bun run verify` script added for SymbiYosys model checking.
- **examples/hardware/tang_nano_20k/**: Approximately 12 new hardware example subdirectories.
- **testbenches/**: New UVM spec files for each stdlib module.
- **CI**: Coverage gate added; `bun run quality` extended to include coverage threshold check.
- **No proprietary EDA dependency added**: all synthesis, P&R, and programming remains Yosys + nextpnr + gowin_pack + openFPGALoader.

## Non-goals

- No support for closed-source toolchains (Vivado, Quartus, Gowin EDA proprietary pack beyond existing usage).
- No partial reconfiguration or dynamic device configuration.
- No high-speed USB (HS/SS) - only USB Full-Speed for this release.
- No HDMI audio - video output only (DVI-compatible TMDS).
- No SystemC or HLS-style high-level synthesis; the compiler remains a TypeScript-subset-to-SV translator.
- No dynamic formal property synthesis; only static assertion checking via SVA emission is in scope.

## OSS Toolchain Impact

All new examples and stdlib modules target Tang Nano 20K with the existing fully-verified OSS path: `synth_gowin` -> `nextpnr-himbaechel` -> `gowin_pack` -> `openFPGALoader`. No new board is added in this change. CDC timing constraints output will be in nextpnr-compatible `set_clock_groups` / `set_false_path` format. No proprietary constraint file formats are produced.

## Agent Ownership

| Area | Owner |
|---|---|
| Multiclock compiler passes | Compiler Agent |
| CDC synchroniser codegen | Compiler Agent |
| `@ts2v/stdlib` package | Compiler Agent + Toolchain Agent |
| Ergonomics layer (runtime decorators) | Compiler Agent |
| Hardware examples | Toolchain Agent |
| Formal verification (`@Assert`/SymbiYosys) | Compiler Agent + QA Agent |
| Nimble processor example | Compiler Agent + Toolchain Agent |
| Matrix multiply UART example | Compiler Agent + Toolchain Agent |
| TPU UART example | Compiler Agent + Toolchain Agent |
| Test coverage expansion | QA Agent |
| Documentation and README | Documentation Agent |

## Delivery Gates

- `bun run quality` passes (including new coverage threshold).
- `bun run compile:example` generates artifacts for all new hardware examples.
- `bun run test:uvm` passes for all new stdlib testbench specs.
- At least one real-board flash per new protocol example logged in `docs/append-only-engineering-log.md`.
- nibble4 CPU example compiles, synthesises, and flashes on Tang Nano 20K with logged output.
- matrix_uart and tpu_uart examples compile, flash, and produce correct results via the CLI client.
- At least one formal property verified on a design via `bun run verify` with SymbiYosys.

## Known Compiler Limitations Affecting Scope

- Ternary operator `?:` is not supported; all stdlib modules must use `if/else`.
- `LogicArray` indexed sequential access is not supported; FIFO CDC primitive will use a counter-based approach.
- No module-level `let`/`var`; all module-level values use `const`.
- Multi-file designs compile the directory, not individual files - stdlib modules must be directory-based.
