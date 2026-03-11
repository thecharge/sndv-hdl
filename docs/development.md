# Development Guide

## If You Come From TypeScript
Start with this mental model:
- `class` is your hardware module.
- fields are wires/registers.
- `@Sequential('clk')` is `always_ff`.
- `@Combinational` is `always_comb`.
- there is no dynamic allocation at runtime in hardware.

Do not treat this like Node.js code that "runs later". The compiler is converting your class into RTL structure.

## Prerequisites
- Linux host with USB access to FPGA board
- Bun 1.3+
- Podman or Docker
- Git

## Workspace Map
- `apps/cli`: compile/flash command entrypoint
- `packages/core`: parser + typecheck + codegen
- `packages/runtime`: decorators + `Bit`/`Logic` types
- `packages/toolchain`: synthesis/programming orchestration
- `packages/process`: command runner facade
- `packages/config`: workspace + board config loading
- `packages/types`: shared contract types

## First 15 Minutes
1. Install and validate local quality gates.
```bash
bun install
bun run quality
```
2. Build the toolchain container.
```bash
bun run toolchain:image:build
```
3. Compile a known-good board example.
```bash
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/tang20k
```

## Compile And Flash (Persistent)
```bash
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/tang20k \
  --flash
```

The flash path now calls `openFPGALoader --write-flash --verify`, not SRAM-only programming.

## Tang Nano 20K LED Behavior
The user LEDs are active-low:
- `0` turns LED on
- `1` turns LED off

If your pattern looks inverted (all LEDs lit when you expected one), check active-low handling first.

## Debug Loop When Hardware Looks Wrong
1. Confirm host USB sees a probe change.
```bash
lsusb
```
2. Confirm container can enumerate probes.
```bash
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```
3. Flash with CLI (`--flash`) and check for write/verify lines.
4. Power-cycle board.
5. Re-check behavior against expected LED polarity.

## Recommended Bring-Up Sequence
1. `examples/hardware/tang_nano_20k_blinker.ts`
2. `examples/hardware/usb_jtag_probe_blinker.ts`
3. `examples/hardware/tang_nano_20k_reset_debug.ts`
4. `examples/hardware/tang_nano_20k_uart_debug.ts`

## Boundaries
- Process execution belongs in `@ts2v/process`.
- Board-specific synth/flash behavior belongs in `@ts2v/toolchain` adapters.
- Programmer profile tuning belongs in `configs/workspace.config.json`.
