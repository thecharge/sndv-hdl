## 1. Monorepo Scaffold and stdlib Package Setup

- [x] 1.1 Create `packages/stdlib/` with `package.json` (name `@ts2v/stdlib`), `tsconfig.json`, and Turborepo entry; add to workspace root `package.json`. | Agent: Build Agent | Validate: `bun install && bun run build`
- [x] 1.2 Create `packages/stdlib/src/index.ts` barrel export and subdirectory stubs: `cdc/`, `i2c/`, `i3c/`, `spi/`, `uart/`, `usb/`, `can/`, `pwm/`, `onewire/`, `ws2812/`, `vga/`, `hdmi/`. | Agent: Build Agent | Validate: `bun run build`
- [x] 1.3 Add `@ts2v/stdlib` as a dev dependency in `packages/core/`, `examples/`, and `testbenches/` workspace entries. | Agent: Build Agent | Validate: `bun install`

## 2. Compiler - Multiclock Domain AST Extension

- [x] 2.1 Extend `ClassModuleAST` in `packages/core/src/compiler/class-compiler/class-module-ast.ts` to add `clocks: { name: string; freq?: number; pin?: string }[]` field on `ClassModuleNode`. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 2.2 Extend `class-module-parser.ts` to parse `@ClockDomain('name', { freq: number })` decorator on `@Module` classes and populate `clocks[]` on the AST node; reject duplicate domain names with a source-location error. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 2.3 Extend `@Sequential` parsing in `class-module-parser.ts` to accept an optional `{ clock: 'domainName' }` argument that binds the block to a named domain. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 2.4 Write unit tests for the clock-domain AST extension in `packages/core/src/__tests__/clock-domain-analysis.test.ts` covering: single-domain registration, multi-domain registration, duplicate domain error, sequential block domain binding. | Agent: QA Agent | Validate: `bun test packages/core/src/__tests__/clock-domain-analysis.test.ts`

## 3. Compiler - Multiclock Codegen

- [x] 3.1 Update `ClassSequentialEmitter` in `class-sequential-emitter.ts` to emit separate `always_ff` blocks per clock domain, each with the correct sensitivity list derived from the domain's clock and reset. | Agent: Compiler Agent | Validate: `bun run build && bun run compile:example`
- [x] 3.2 Update `ClassModuleEmitter` in `class-module-emitter.ts` to add one input port per declared clock domain to the module signature; update submodule binding to map named clock ports explicitly. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 3.3 Recognise `ClockDomainCrossing<Logic>` from `@ts2v/stdlib/cdc` in the emitter and generate a two-FF synchroniser `always_ff` chain in the destination domain's clock. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 3.4 Recognise `AsyncFifo<T, Depth>` from `@ts2v/stdlib/cdc` in the emitter and generate dual-clock async FIFO SV with gray-code pointer synchronisers. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 3.5 Emit a compiler warning (not error) when a signal crosses clock domains without a recognised CDC primitive. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 3.6 Update `generate-board-constraints.ts` to emit one `create_clock` entry per `@ClockDomain` declaration when `--clock-constraints` flag is passed. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 3.7 Add `--clock-constraints <file>` flag to `apps/cli/src/index.ts`; wire through to compiler engine. | Agent: Build Agent | Validate: `bun run build`
- [x] 3.8 Write unit tests in `packages/core/src/__tests__/cdc-detection.test.ts` covering: unguarded crossing warning, two-FF accepted, AsyncFifo accepted, multi-domain SV output shape. | Agent: QA Agent | Validate: `bun test packages/core/src/__tests__/cdc-detection.test.ts`

## 4. stdlib - CDC Primitives

- [x] 4.1 Implement `ClockDomainCrossing<Logic>` in `packages/stdlib/src/cdc/ClockDomainCrossing.ts` as a `@Module` class with explicit two-FF structure, following all TS subset rules. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 4.2 Implement `AsyncFifo<T, Depth>` in `packages/stdlib/src/cdc/AsyncFifo.ts` as a `@Module` class with gray-code pointers and dual-clock `@Sequential` blocks (using `@ClockDomain`). | Agent: Compiler Agent | Validate: `bun run build`
- [x] 4.3 Export both from `packages/stdlib/src/cdc/index.ts`. | Agent: Build Agent | Validate: `bun run build`

## 5. stdlib - Protocol Modules

- [x] 5.1 Implement `I2cController` in `packages/stdlib/src/i2c/` supporting 100 kHz and 400 kHz modes, SCL/SDA open-drain output, START/STOP/ACK/NACK. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.2 Implement `I2cPeripheral` (device) in `packages/stdlib/src/i2c/` with address matching and byte read/write. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.3 Implement `I3cController` in `packages/stdlib/src/i3c/` with I2C-compatible fallback and basic CCC command support. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.4 Implement `SpiController` and `SpiPeripheral` in `packages/stdlib/src/spi/` for modes 0-3 (controller) and mode 0 (peripheral), with parametric clock divider. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.5 Implement `UartTx` and `UartRx` in `packages/stdlib/src/uart/` with configurable baud divisor, 8-N-1 framing, 16x oversampling RX. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.6 Implement `UsbFsDevice` in `packages/stdlib/src/usb/` for USB Full-Speed device (12 Mbps), NRZI encoding, bit-stuffing, SYNC/EOP detection, and basic SOF/SETUP/IN/OUT packet handling. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.7 Implement `CanController` in `packages/stdlib/src/can/` with TWAI-compatible bit-stuffing, CRC, arbitration, and ACK logic for standard (11-bit ID) frames. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.8 Implement `PwmGenerator` in `packages/stdlib/src/pwm/` with configurable period and duty cycle constants. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.9 Implement `OneWireController` in `packages/stdlib/src/onewire/` with reset pulse, presence detect, write-byte, and read-byte operations. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.10 Extract and refactor `Ws2812Driver` from `examples/ws2812/` into `packages/stdlib/src/ws2812/` with clean API; update existing examples to import from stdlib. | Agent: Compiler Agent | Validate: `bun run build && bun run compile:example`
- [x] 5.11 Implement `VgaTimingGenerator` in `packages/stdlib/src/vga/` producing hsync, vsync, active-area, and pixel-address outputs for 640x480@60Hz. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.12 Implement `HdmiDviOutput` in `packages/stdlib/src/hdmi/` accepting RGB + hsync/vsync + pixel-clock domain, emitting TMDS-encoded differential output; use `@ClockDomain` for pixel and 5x serialiser clocks. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 5.13 Update `packages/stdlib/src/index.ts` to export all protocol modules. | Agent: Build Agent | Validate: `bun run build`

## 6. Runtime - Ergonomics Helpers

- [x] 6.1 Add `SignalBus<T>` generic type to `packages/runtime/src/types.ts`; update compiler to expand bus types to individual ports in the emitter. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 6.2 Add `Reg<T>` type alias to `packages/runtime/src/types.ts`; ensure compiler emits `always_ff` register for `Reg`-typed variables. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 6.3 Add `Edge` type and `rising(signal)` / `falling(signal)` functions to `packages/runtime/src/types.ts`; implement compiler translation to single-cycle edge-detect SV in `class-sequential-emitter.ts`. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 6.4 Add `@Hardware` decorator to `packages/runtime/src/decorators.ts`; implement compiler desugaring pass: infer `@Sequential` or `@Combinational` based on clock signal presence. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 6.5 Improve compiler error messages to include `file.ts:line:col:` source location prefix for all errors and warnings across parser, typechecker, and emitter. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 6.6 Implement `LogicArray` width inference from literal initialisers in the typechecker. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 6.7 Write unit tests for all six ergonomics features in `packages/core/src/__tests__/ergonomics.test.ts`. | Agent: QA Agent | Validate: `bun test packages/core/src/__tests__/ergonomics.test.ts`

## 7. UVM Testbench Infrastructure Updates

- [x] 7.1 Extend `SeqTestSpec` in `packages/types/src/testbench.ts` to accept a `clocks?: { name: string; halfPeriodNs: number }[]` array alongside existing `clockSignal`. | Agent: QA Agent | Validate: `bun run build`
- [x] 7.2 Update `uvm-lite-testbench-generator.ts` to emit one clock-toggle `initial` process per entry in `clocks[]`; preserve single-clock backward-compatibility. | Agent: QA Agent | Validate: `bun test:uvm`
- [x] 7.3 Add reset-sequencing logic to the generator: in multi-clock specs, de-assert reset after all declared domains have run for at least two cycles. | Agent: QA Agent | Validate: `bun run test:uvm`
- [x] 7.4 Add `--coverage` flag to UVM test runner script `scripts/run-uvm-testbench.sh`; activate Istanbul/c8 instrumentation and write output to `.artifacts/coverage/uvm-lcov.info`. | Agent: QA Agent | Validate: `bash scripts/run-uvm-testbench.sh --coverage`

## 8. Test Coverage Infrastructure

- [x] 8.1 Add `bun run test:coverage` script to root `package.json` using c8; write report to `.artifacts/coverage/lcov.info`. | Agent: QA Agent | Validate: `bun run test:coverage`
- [x] 8.2 Add coverage threshold check (80% line coverage per package) to `bun run quality` script; fail on breach. | Agent: QA Agent | Validate: `bun run quality`
- [x] 8.3 Create UVM testbench specs for all stdlib modules under `testbenches/`: `i2c-controller.tb-spec.ts`, `spi-controller.tb-spec.ts`, `uart-tx.tb-spec.ts`, `uart-rx.tb-spec.ts`, `can-controller.tb-spec.ts`, `ws2812.tb-spec.ts`, `vga-timing.tb-spec.ts`, `hdmi-dvi.tb-spec.ts`, `cdc-two-ff.tb-spec.ts`, `cdc-async-fifo.tb-spec.ts`. | Agent: QA Agent | Validate: `bun run test:uvm`
- [x] 8.4 Verify all existing testbench specs still pass after all changes. | Agent: QA Agent | Validate: `bun run test:uvm`

## 9. Hardware Examples

- [x] 9.1 Create `examples/hardware/tang_nano_20k/spi-loopback/` with SpiController + SpiPeripheral loopback example using `@ts2v/stdlib/spi`. | Agent: Toolchain Agent | Validate: `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/spi-loopback --board boards/tang_nano_20k.board.json --out .artifacts/spi-loopback`
- [x] 9.2 Create `examples/hardware/tang_nano_20k/uart-echo/` using `@ts2v/stdlib/uart`. | Agent: Toolchain Agent | Validate: compile command exits 0
- [x] 9.3 Create `examples/hardware/tang_nano_20k/i2c-scan/` using `@ts2v/stdlib/i2c` I2cController to scan the I2C bus. | Agent: Toolchain Agent | Validate: compile command exits 0
- [x] 9.4 Create `examples/hardware/tang_nano_20k/pwm-fade/` using `@ts2v/stdlib/pwm` to fade onboard LEDs. | Agent: Toolchain Agent | Validate: compile command exits 0
- [x] 9.5 Create `examples/hardware/tang_nano_20k/ws2812-stdlib/` importing from `@ts2v/stdlib/ws2812` (replaces inline impl). | Agent: Toolchain Agent | Validate: compile command exits 0
- [x] 9.6 Create `examples/hardware/tang_nano_20k/dual-clock-sync/` demonstrating `ClockDomainCrossing<Logic>` between sys and a second domain. | Agent: Toolchain Agent | Validate: compile command exits 0
- [x] 9.7 Create `examples/hardware/tang_nano_20k/dual-clock-fifo/` demonstrating `AsyncFifo<LogicArray<8>, 16>` across two domains. | Agent: Toolchain Agent | Validate: compile command exits 0
- [x] 9.8 Create `examples/hardware/tang_nano_20k/hdmi-colour-bars/` using `@ts2v/stdlib/hdmi` for a static colour bar pattern. | Agent: Toolchain Agent | Validate: compile command exits 0
- [x] 9.9 Flash at least one protocol example per category (SPI, UART, I2C, WS2812, PWM) on real Tang Nano 20K hardware and log results in `docs/append-only-engineering-log.md`. | Agent: Toolchain Agent | Validate: `openFPGALoader` exits 0; log entry added
- [x] 9.10 Flash dual-clock-sync example on real Tang Nano 20K and log result. | Agent: Toolchain Agent | Validate: log entry in `docs/append-only-engineering-log.md`

## 10. Documentation and README Polish

- [x] 10.1 Update `docs/` architecture diagram (Mermaid) to include `@ts2v/stdlib` package and multiclock compiler passes. | Agent: Documentation Agent | Validate: Mermaid renders without syntax error
- [x] 10.2 Add `docs/guides/multiclock-domain.md` covering `@ClockDomain`, `ClockDomainCrossing`, `AsyncFifo`, and `--clock-constraints`; reference in `README.md` docs index. | Agent: Documentation Agent | Validate: README.md updated
- [x] 10.3 Add `docs/guides/stdlib-protocol-library.md` with one section per protocol module covering API, example wiring, and known limitations; reference in `README.md`. | Agent: Documentation Agent | Validate: README.md updated
- [x] 10.4 Add `docs/guides/ergonomics.md` covering `SignalBus`, `Reg`, `Edge`, `rising`/`falling`, `@Hardware`; include migration note from `@Sequential`/`@Combinational`. | Agent: Documentation Agent | Validate: README.md updated
- [x] 10.5 Update `README.md` examples section to list all new hardware examples with one-line descriptions. | Agent: Documentation Agent | Validate: README.md references all 8 new hardware example directories
- [x] 10.6 Update quick-start section in `README.md` to use the ergonomics API for the hello-world blinker example. | Agent: Documentation Agent | Validate: `bun run quality` passes
- [x] 10.7 Append all new hardware design decisions and flash results to `docs/append-only-engineering-log.md`. | Agent: Documentation Agent | Validate: log entries present for all flash events

## 11. Formal Verification

- [x] 11.1 Add `@Assert` and `@Assume` decorators to `packages/runtime/src/decorators.ts` typed to accept `() => boolean`-compatible arrow functions. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 11.2 Implement compiler recognition of `@Assert` / `@Assume` in `class-module-parser.ts`; emit SVA `assert property` / `assume property` blocks inside `always_comb` in `class-sequential-emitter.ts`. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 11.3 Add `.sby` file generation to `compiler-engine.ts`: when any `@Assert` / `@Assume` is present, write a SymbiYosys config file (bmc engine, depth 20) to the output directory. | Agent: Compiler Agent | Validate: `bun run build && bun run compile:example` on a design with `@Assert`
- [x] 11.4 Add `bun run verify <file.sby>` script to root `package.json`; invoke SymbiYosys inside the existing toolchain container; print `PASS` / `FAIL` with property name and cycle depth. | Agent: Build Agent | Validate: `bun run verify` on a trivially-true assertion exits 0
- [x] 11.5 Write unit tests for `@Assert` / `@Assume` codegen in `packages/core/src/__tests__/formal-verification.test.ts` covering: SVA output shape, `.sby` generation, no-assertion no-sby. | Agent: QA Agent | Validate: `bun test packages/core/src/__tests__/formal-verification.test.ts`
- [x] 11.6 Add SymbiYosys to the toolchain container image; verify `yosys-smtbmc` is available inside the container. | Agent: Toolchain Agent | Validate: `podman run ts2v-gowin-oss:latest sby --help`
- [x] 11.7 Document formal verification in `docs/guides/formal-verification.md` covering `@Assert`, `@Assume`, `.sby` auto-generation, and `bun run verify`; add to README docs index. | Agent: Documentation Agent | Validate: README.md updated

## 12. Nimble Processor Example

- [x] 12.1 Move `cpu/ts/nibble4_core.ts`, `cpu/ts/nibble4_soc.ts`, `cpu/ts/nibble4_dual_soc.ts` to `examples/cpu/nibble4/`; update all imports to use `'@ts2v/runtime'`. | Agent: Compiler Agent | Validate: `bun run build`
- [x] 12.2 Compile `examples/cpu/nibble4` as a directory with ts2v; fix any TypeScript subset violations revealed by the compilation (no ternary, no module-level let/var, named constants). | Agent: Compiler Agent | Validate: `bun run apps/cli/src/index.ts compile examples/cpu/nibble4 --board boards/tang_nano_20k.board.json --out .artifacts/nibble4` exits 0
- [x] 12.3 Synthesise nibble4 via full OSS toolchain (Yosys + nextpnr-himbaechel + gowin_pack); fix any synthesis errors in the generated SV. | Agent: Toolchain Agent | Validate: synthesis exits 0 and `.artifacts/nibble4/nibble4.fs` is produced
- [x] 12.4 Flash nibble4 to Tang Nano 20K using `--flash`; log result in `docs/append-only-engineering-log.md`. | Agent: Toolchain Agent | Validate: openFPGALoader exits 0; log entry added
- [x] 12.5 Add `@Assert(() => this.pc === 0)` reset property to nibble4 core; run `bun run verify` and confirm PASS; log result. | Agent: Compiler Agent | Validate: `bun run verify .artifacts/nibble4/nibble4.sby` exits 0
- [x] 12.6 Write `testbenches/nibble4-cpu.tb-spec.ts` covering reset, ADD instruction, and JUMP instruction scenarios using `SeqTestSpec`. | Agent: QA Agent | Validate: `bun run test:uvm` passes nibble4-cpu suite
- [x] 12.7 Add nibble4 to README.md examples section and `docs/guides/examples-matrix.md` with compile command and one-line description. | Agent: Documentation Agent | Validate: README references `examples/cpu/nibble4/`
- [x] 12.8 Rewrite `nibble4_soc.ts`: fix RAM read_mux (was always returning 0), add 32 explicit nibble registers (m00-m31), add bootloader write interface (bl_wr_en/addr/data), simplify UART TX to 4-state single-nibble-per-byte protocol. | Agent: Compiler Agent | Validate: compile command exits 0
- [x] 12.9 Create `nibble4_bootloader.ts`: UART RX FSM + bootloader FSM (BL_WAIT_SYNC → BL_WAIT_LEN → BL_LOAD → BL_RUN); protocol: 0xAA sync + count + N nibble bytes; outputs bl_wr_en, bl_wr_addr, bl_wr_data, cpu_run. | Agent: Compiler Agent | Validate: compile command exits 0
- [x] 12.10 Create `nibble4_top.ts`: top-level SoC wiring clk/rst_n/uart_rx/uart_tx/led; @Combinational bridge for cross-module signal renaming; hardware back-pressure (bus_ack = 0 when writing to UART while busy). | Agent: Compiler Agent | Validate: compile exits 0 and SV shows all 4 submodule instances
- [x] 12.11 Create `programs/counter.n4asm`: 19-nibble counter 0..15 over UART (LDI r0,0 / LDI r1,0 / loop: OUT / LDI r1,1 / ADD / LDI r1,0 / JMP loop). | Agent: Compiler Agent | Validate: assembler produces 19 nibbles, JMP target=6
- [x] 12.12 Create `tools/assemble.ts`: nibble4 assembler - parses .n4asm, resolves labels, validates 4-bit jump targets, outputs .bin; create `tools/load.ts`: UART loader (0xAA sync + count + nibbles). | Agent: Compiler Agent | Validate: `bun run tools/assemble.ts programs/counter.n4asm` exits 0 and produces .bin
- [x] 12.13 Create `flash.sh`, `load.sh`, `run.sh` convenience scripts; create `README.md` with ISA reference, memory map, bootloader protocol, assembler usage. | Agent: Toolchain Agent | Validate: scripts exist and are executable

## 13. Matrix Multiply UART Example

- [x] 13.1 Create `examples/hardware/tang_nano_20k/matrix_uart/hw/` with TypeScript hardware modules: `matrix_top.ts` (top-level), `matrix_engine.ts` (4x4 8-bit multiply-accumulate core, 16-bit output elements), `matrix_uart_rx.ts` (receives 64 bytes: two flattened 4x4 matrices), `matrix_uart_tx.ts` (sends 32 bytes: flattened 16-element 16-bit result); all at 115200 baud / 27 MHz. No ternary, no module-level let/var, named constants only. | Agent: Compiler Agent | Validate: `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/matrix_uart/hw --board boards/tang_nano_20k.board.json --out .artifacts/matrix_uart` exits 0
- [x] 13.2 Create `examples/hardware/tang_nano_20k/matrix_uart/client/matrix.ts` Bun CLI: reads JSON `{ "a": number[][], "b": number[][] }` from stdin, encodes 64 bytes to FPGA, reads 32 bytes back, prints `{ "a", "b", "result": number[][], "ms" }`. | Agent: Compiler Agent | Validate: manual test with identity matrices returns identity result
- [x] 13.3 Create `examples/hardware/tang_nano_20k/matrix_uart/client/diag.ts` diagnostic client (mirrors calc_uart/client/diag.ts pattern) for raw byte-level UART diagnostics. | Agent: Compiler Agent | Validate: script runs without syntax error
- [x] 13.4 Create `examples/hardware/tang_nano_20k/matrix_uart/flash.sh` and `run.sh` following calc_uart's exact script patterns (REPO-relative paths, auto-detect logic, `exec bun` client invocation). | Agent: Toolchain Agent | Validate: `bash -n flash.sh && bash -n run.sh` (syntax check)
- [x] 13.5 Create `examples/hardware/tang_nano_20k/matrix_uart/README.md` documenting hardware design, UART protocol (byte encoding of matrices), flash and run steps, example I/O. | Agent: Documentation Agent | Validate: README is readable and references flash/run commands
- [x] 13.6 Flash matrix_uart to Tang Nano 20K; verify correct result for at least identity matrix and one non-trivial multiply; log result in `docs/append-only-engineering-log.md`. | Agent: Toolchain Agent | Validate: openFPGALoader exits 0; log entry added
- [x] 13.7 Write `testbenches/matrix-uart.tb-spec.ts` (`SeqTestSpec`) covering reset, identity multiply, and a non-trivial 4x4 multiply with precomputed expected result. | Agent: QA Agent | Validate: `bun run test:uvm` passes matrix-uart suite
- [x] 13.8 Add matrix_uart to README.md examples section and `docs/guides/examples-matrix.md`. | Agent: Documentation Agent | Validate: README updated

## 14. TPU UART Example

- [x] 14.1 Create `examples/hardware/tang_nano_20k/tpu_uart/hw/` with TypeScript hardware modules: `tpu_top.ts`, `tpu_engine.ts` (dot-product, 16-bit MAC accumulator, ReLU, reset_acc; 4-element 8-bit vectors), `tpu_uart_rx.ts` (receives op-code + operand bytes), `tpu_uart_tx.ts` (sends result bytes); all at 115200 baud / 27 MHz. No ternary, no module-level let/var, named constants only. | Agent: Compiler Agent | Validate: `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/tpu_uart/hw --board boards/tang_nano_20k.board.json --out .artifacts/tpu_uart` exits 0
- [x] 14.2 Create `examples/hardware/tang_nano_20k/tpu_uart/client/tpu.ts` Bun CLI: reads JSON `{ "op": "dot"|"mac"|"relu"|"reset_acc", "a": number[], "b"?: number[] }` from stdin, encodes command to FPGA, reads result, prints `{ "op", "result": number|number[], "ms" }`. | Agent: Compiler Agent | Validate: manual dot product `[1,2,3,4]·[4,3,2,1]` returns 20
- [x] 14.3 Create `examples/hardware/tang_nano_20k/tpu_uart/client/diag.ts` diagnostic client for raw byte-level UART diagnostics (same pattern as calc_uart). | Agent: Compiler Agent | Validate: script runs without syntax error
- [x] 14.4 Create `examples/hardware/tang_nano_20k/tpu_uart/flash.sh` and `run.sh` following calc_uart's exact script patterns. | Agent: Toolchain Agent | Validate: `bash -n flash.sh && bash -n run.sh`
- [x] 14.5 Create `examples/hardware/tang_nano_20k/tpu_uart/README.md` documenting the TPU operations (dot, mac, relu, reset_acc), UART protocol (op-code byte + operand encoding), flash and run steps, and example I/O. | Agent: Documentation Agent | Validate: README is readable and matches actual behavior
- [x] 14.6 Flash tpu_uart to Tang Nano 20K; verify dot product, mac accumulation, and relu results; log in `docs/append-only-engineering-log.md`. | Agent: Toolchain Agent | Validate: openFPGALoader exits 0; log entry added
- [x] 14.7 Write `testbenches/tpu-uart.tb-spec.ts` (`SeqTestSpec`) covering reset, dot product with known result, mac accumulation across two calls, and ReLU passthrough. | Agent: QA Agent | Validate: `bun run test:uvm` passes tpu-uart suite
- [x] 14.8 Add tpu_uart to README.md examples section and `docs/guides/examples-matrix.md`. | Agent: Documentation Agent | Validate: README updated

## 15. Final Quality Gate

- [x] 15.1 Run `bun run build` in all packages; fix any TypeScript errors introduced by this change. | Agent: Build Agent | Validate: exit 0
- [x] 15.2 Run `bun run quality` (lint + type-check + coverage gate); fix all failures. | Agent: QA Agent | Validate: exit 0
- [x] 15.3 Run `bun run compile:example` for all new hardware examples; verify `.artifacts/` output for each. | Agent: QA Agent | Validate: exit 0 for all examples
- [x] 15.4 Run `bun run test:uvm` for all testbench specs including new stdlib, matrix-uart, and tpu-uart specs; fix failures. | Agent: QA Agent | Validate: all specs pass
- [x] 15.5 Run `bun run verify` on nibble4 and at least one stdlib example with assertions; confirm PASS. | Agent: QA Agent | Validate: exit 0
