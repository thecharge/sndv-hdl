# End-to-End Delivery Guide

Step-by-step workflow from writing TypeScript hardware source to a bitstream running on real FPGA hardware.

## Prerequisites

| Tool               | Minimum Version | Purpose                               |
| ------------------ | --------------- | ------------------------------------- |
| Bun                | 1.3+            | Package manager, runtime, test runner |
| Podman (or Docker) | any             | Synthesis/flash container             |
| Git                | any             | Source control                        |
| Linux host         | any             | USB passthrough to FPGA programmer    |

---

## Step 1: Set Up the Workspace

```bash
git clone https://github.com/thecharge/sndv-hdl.git ts2v
cd ts2v
bun install
```

Run the quality gate to confirm the workspace is healthy before touching any hardware:

```bash
bun run quality
# Expected: 189+ pass, 0 fail
```

---

## Step 2: Build the Toolchain Container (Once)

The synthesis and programming flow runs inside `ts2v-gowin-oss:latest`, which bundles Yosys, nextpnr-himbaechel, gowin_pack, and openFPGALoader.

```bash
bun run toolchain:image:build
```

This is only needed once (or after `toolchain/Dockerfile` changes).

---

## Step 3: Write Your Hardware Module

Create a new example subfolder. Every example lives in its own directory with its source and testbench co-located:

```
examples/hardware/tang_nano_20k/my_module/
  my_module.ts       ← TypeScript hardware source
  tb_my_module.sv    ← SystemVerilog testbench
```

**Minimal template:**

```typescript
import { Module, Input, Output, Sequential, Logic } from '@ts2v/runtime';

class MyModule extends Module {
  @Input  clk:   Logic<1>;
  @Input  rst_n: Logic<1>;
  @Output led:   Logic<6> = 0x3f; // active-low: all off

  @Sequential
  tick() {
    if (!this.rst_n) {
      this.led = 0x3f;
    } else {
      this.led = this.led + 1;
    }
  }
}
```

Key rules:
- Extend `Module` and use `@Input` / `@Output` decorators: these become IEEE 1800-2017 ANSI ports.
- Use `Logic<N>` for N-bit signals; all ports are emitted as `input logic` / `output logic`.
- Use `@Sequential` for `always_ff`; use `@Combinational` for `always_comb`.
- Local `let`/`const` variables inside `@Sequential` that are assigned in multiple branches are promoted to module-level `logic` registers automatically.
- Write all logic as `this.signalName` assignments: no direct SV emit.

See `docs/specification.md` for the complete language reference.

---

## Step 4: Compile to SystemVerilog

After any changes to `packages/core/`, run `bun run build` first to keep dist files in sync.

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/my_module/my_module.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/my_module
```

Inspect the generated SystemVerilog before synthesis:

```bash
cat .artifacts/my_module/my_module.sv
```

Confirm:
- Module name matches your class name.
- All ports are declared as `input logic` / `output logic`.
- `always_ff @(posedge clk or negedge rst_n)` is present for sequential blocks.
- No TypeScript artifacts in the output.

---

## Step 5: Verify USB Probe Visibility

Connect the Tang Nano 20K via USB and put it in programming mode (press S2 then S1 while connected, or follow the board manual).

```bash
# Host-side check
lsusb
# Expected line: 0403:6010 Future Technology Devices International, Ltd FT2232C/D/H
# (may appear as "SIPEED USB Debugger")

# Container-side probe scan
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```

If the device is not found:
- Check USB permissions: the running user must be in the `plugdev` group (or equivalent).
- On some distros: `sudo udevadm control --reload && sudo udevadm trigger`
- See `docs/guides/programmer-profiles-and-usb-permissions.md` for full diagnostics.

---

## Step 6: Synthesize and Flash

Add `--flash` to the compile command. The CLI handles compile to synthesize (yosys to nextpnr to gowin_pack) to flash (openFPGALoader) in a single invocation:

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/my_module/my_module.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/my_module \
  --flash
```

### Confirmed Flash Output

A successful flash to Winbond W25Q64 (Tang Nano 20K) looks like:

```
[artifact] systemverilog: .artifacts/my_module/my_module.sv
[artifact] constraints:   .artifacts/my_module/tang_nano_20k.cst
[toolchain] yosys synth_gowin ...
[toolchain] nextpnr-himbaechel ...
[toolchain] gowin_pack ...
[programmer] openFPGALoader --external-flash --write-flash --verify --cable ft2232
Detected: Winbond W25Q64 128 sectors size: 64Mb
Writing:  [==================================================] 100.00%  Done
Verifying write ... Reading: [==================================================] Done
```

If flash fails, see `docs/guides/debugging-and-troubleshooting.md`.

---

## Step 7: Power Cycle and Verify

Power off the board and power it back on. The bitstream is written to external SPI flash and reloads automatically on power-up. Expected behavior should persist without a USB connection.

---

## Step 8: Write the Testbench Spec (TypeScript only)

All testbench source in ts2v is **TypeScript**. Never write raw SystemVerilog testbench files. Use the spec types from `testbenches/tb-spec-types.ts` and place the spec in `testbenches/`:

```typescript
// testbenches/my_module.tb-spec.ts
import type { SeqTestSpec } from './tb-spec-types';

export const myModuleSpec: SeqTestSpec = {
  kind: 'sequential',
  module: 'MyModule',
  sourceFile: 'examples/hardware/tang_nano_20k/my_module/my_module.ts',
  clock: 'clk',
  clockHalfPeriodNs: 18,  // 27 MHz
  checks: [
    {
      label: 'reset_leds_off',
      forcedSignals:   { rst_n: "1'b1" },
      expectedSignals: { led: "6'h3f" },
    },
    {
      label: 'phase0_led0_on',
      forcedSignals:   { phase: "3'd0" },
      expectedSignals: { led: "6'h3e" },
    },
  ],
};
```

For combinational (function-based) modules use `CombTestSpec`. See `testbenches/adder.tb-spec.ts` for a worked example.

The UVM-style simulation pipeline (`bun run test:uvm`) reads TypeScript specs from `testbenches/uvm/`, generates SV in `.artifacts/uvm/`, and runs them in the container. Generated SV is an artifact, not a source file.

---

## Step 9: Run the Quality Gate

```bash
bun run quality
# Must be: X pass, 0 fail
```

Also run the UVM simulation suite if you added or modified verification specs:

```bash
bun run test:uvm
# ALU: 25/25, Blinky: 6/6
```

---

## Flagship Reference Example

The WS2812 Interactive Demo (`examples/hardware/tang_nano_20k/ws2812_demo/`) is the flagship hardware example. It demonstrates:

- S2 (btn) held to WS2812 strip outputs solid RED; released to off (black)
- S1 (rst_n) held to 6-LEDs walk one by one; released to all LEDs off and walk resets
- WS2812 serial state machine with `t0h`/`t1h`/`treset` timing constants
- Method-local registers (`bitValue`, `highTicks`) promoted from `@Sequential` to module scope
- No async reset: FPGA registers initialise to declared defaults on power-up

It has been confirmed synthesised and flashed to a physical Tang Nano 20K (Winbond W25Q64). Its TypeScript testbench spec lives in `testbenches/ws2812_demo.tb-spec.ts`.

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/ws2812_demo/ws2812_demo.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/ws2812_demo \
  --flash
```

---

## Troubleshooting Reference

| Problem                  | First Check                                        | Guide                                                    |
| ------------------------ | -------------------------------------------------- | -------------------------------------------------------- |
| `bun run quality` fails  | Check error output for file/line                   | `docs/qa-testing.md`                                     |
| Compile error            | Check TypeScript source for unsupported constructs | `docs/specification.md`                                  |
| Synthesis fails          | Check yosys stderr for unsupported SV constructs   | `docs/guides/debugging-and-troubleshooting.md`           |
| Flash: device not found  | `lsusb`, USB permissions, probe profile            | `docs/guides/programmer-profiles-and-usb-permissions.md` |
| Flash: wrong behavior    | Check pin mapping in board JSON                    | `docs/guides/board-definition-authoring.md`              |
| Power-cycle: no behavior | Confirm `--external-flash` was used                | `docs/guides/tang_nano_20k_programming.md`               |
| Stale codegen            | Run `bun run build` after `packages/core` changes  | `docs/development.md`                                    |
