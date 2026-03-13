# Getting Started: From Empty Folder to Working Blinker

This guide is for someone who has never used ts2v before.
You will go from an empty folder to a blinking LED running on a Tang Nano 20K, with a passing testbench.

No prior knowledge of Verilog, SystemVerilog, or FPGA toolchains is required.

---

## What You Will Have at the End

- A TypeScript class that describes blinking hardware.
- The generated IEEE 1800-2017 SystemVerilog from that class.
- A bitstream running persistently on a Tang Nano 20K from external flash.
- A TypeScript testbench spec that describes and documents the module's behaviour.
- A green quality gate.

---

## Part 1 — Install Prerequisites

You need three tools on your host:

| Tool       | Install                                     | Minimum Version |
| ---------- | ------------------------------------------- | --------------- |
| **Bun**    | `curl -fsSL https://bun.sh/install \| bash` | 1.3             |
| **Podman** | `sudo apt install podman` (Debian/Ubuntu)   | any             |
| **Git**    | `sudo apt install git`                      | any             |

Verify:

```bash
bun --version   # 1.x.y
podman --version
git --version
```

> **Docker** can substitute for Podman. Every command that says `podman` also works with `docker`.

---

## Part 2 — Clone the Repository

```bash
git clone https://github.com/thecharge/sndv-hdl.git ts2v
cd ts2v
bun install
```

---

## Part 3 — Build the Toolchain Container (Once)

The synthesis, place-and-route, and flash steps run inside a container image that bundles the full OSS CAD suite (Yosys, nextpnr, gowin_pack, openFPGALoader).

```bash
bun run toolchain:image:build
```

This takes a few minutes the first time. It only needs to run once — unless you change `toolchain/Dockerfile`.

---

## Part 4 — Verify the Workspace Is Healthy

```bash
bun run quality
```

You should see:

```
189 pass
0 fail
```

If any tests fail at this point, stop and check the README troubleshooting section before continuing.

---

## Part 5 — Write Your Blinker in TypeScript

Create a folder for your module:

```bash
mkdir -p examples/hardware/tang_nano_20k/my_blinker
```

Create `examples/hardware/tang_nano_20k/my_blinker/my_blinker.ts`:

```typescript
import {
  HardwareModule,
  Module,
  Input,
  Output,
  Sequential,
} from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

// Walking blinker: one LED on at a time, cycling through all 6 LEDs.
// Tang Nano 20K LEDs are active-low (0 = on, 1 = off).
@Module
class MyBlinker extends HardwareModule {
  @Input  clk: Bit      = 0;       // 27 MHz clock from oscillator
  @Output led: Logic<6> = 0x3f;    // 6 LEDs, all off at startup

  private counter: Logic<25> = 0;  // slow-down timer: overflows ~1 Hz
  private phase:   Logic<3>  = 0;  // which LED is on (0-5)

  @Sequential('clk')
  tick(): void {
    this.counter = this.counter + 1;

    // When counter overflows (every 2^25 clocks ≈ 1.24 s at 27 MHz),
    // advance the active LED.
    if (this.counter === 0) {
      if (this.phase === 5) {
        this.phase = 0;
      } else {
        this.phase = this.phase + 1;
      }

      if (this.phase === 0) { this.led = 0x3e; }
      else if (this.phase === 1) { this.led = 0x3d; }
      else if (this.phase === 2) { this.led = 0x3b; }
      else if (this.phase === 3) { this.led = 0x37; }
      else if (this.phase === 4) { this.led = 0x2f; }
      else                       { this.led = 0x1f; }
    }
  }
}

export { MyBlinker };
```

**What each part means:**

| TypeScript                        | What it does                 | Generated SystemVerilog    |
| --------------------------------- | ---------------------------- | -------------------------- |
| `@Input clk: Bit`                 | Clock input port             | `input logic clk`          |
| `@Output led: Logic<6>`           | 6-bit LED output             | `output logic [5:0] led`   |
| `private counter: Logic<25>`      | Internal register            | `logic [24:0] counter`     |
| `@Sequential('clk')`              | Runs every rising clock edge | `always_ff @(posedge clk)` |
| `this.counter = this.counter + 1` | Non-blocking register update | `counter <= counter + 1`   |

---

## Part 6 — Compile to SystemVerilog

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/my_blinker/my_blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/my_blinker
```

You will see:

```
[artifact] systemverilog: .artifacts/my_blinker/my_blinker.sv
[artifact] constraints:   .artifacts/my_blinker/tang_nano_20k.cst
```

Open `.artifacts/my_blinker/my_blinker.sv` and verify it looks like this:

```systemverilog
module MyBlinker (
  input  logic        clk,
  output logic [5:0]  led
);
  logic [24:0] counter;
  logic [2:0]  phase;

  always_ff @(posedge clk) begin
    counter <= counter + 1;
    if (counter == 0) begin
      // ... phase and led updates ...
    end
  end
endmodule
```

Key things to confirm:
- Module name matches your class name (`MyBlinker`).
- Ports are `input logic` / `output logic` (not `wire`).
- Counter is `[24:0]` (25 bits).

---

## Part 7 — Connect the Board and Verify USB

Plug in the Tang Nano 20K and put it into **programming mode**:
1. Hold **S2** (key near USB port).
2. While holding S2, press and release **S1** (reset).
3. Release S2.

The board is now in download mode. Verify the programmer is visible:

```bash
lsusb
```

Look for a line like:

```
Bus 001 Device 005: ID 0403:6010 Future Technology Devices International, Ltd FT2232C/D/H Dual UART/FIFO IC
```

(It may say "SIPEED USB Debugger" instead of the full name — both are correct.)

---

## Part 8 — Flash to Hardware

Add `--flash` to the compile command. Everything happens automatically: TypeScript → SystemVerilog → synthesis → place-and-route → bitstream → flash.

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/my_blinker/my_blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/my_blinker \
  --flash
```

A successful flash ends with:

```
Writing:  [==================================================] 100.00%  Done
Verifying write ... Reading: [==================================================] Done
```

Power the board off and back on. The LEDs should walk persistently — the bitstream is now in external SPI flash.

---

## Part 9 — Write the Testbench Spec (TypeScript)

Every module must have a TypeScript testbench spec. This documents the expected behaviour and enables automated simulation.

Create `testbenches/my_blinker.tb-spec.ts`:

```typescript
import type { SeqTestSpec } from './tb-spec-types';

export const myBlinkerSpec: SeqTestSpec = {
  kind: 'sequential',
  module: 'MyBlinker',
  sourceFile: 'examples/hardware/tang_nano_20k/my_blinker/my_blinker.ts',
  clock: 'clk',
  clockHalfPeriodNs: 18, // 27 MHz
  checks: [
    {
      label: 'phase0_led0_on',
      forcedSignals:   { phase: "3'd0", counter: "25'd0" },
      expectedSignals: { led: "6'h3e" },
    },
    {
      label: 'phase3_led3_on',
      forcedSignals:   { phase: "3'd3", counter: "25'd0" },
      expectedSignals: { led: "6'h37" },
    },
    {
      label: 'phase5_led5_on',
      forcedSignals:   { phase: "3'd5", counter: "25'd0" },
      expectedSignals: { led: "6'h1f" },
    },
  ],
};
```

**Rules:**
- All testbench source is TypeScript. Never create `.sv` testbench files by hand.
- Generated SV testbenches live in `.artifacts/` — they are build outputs, not source files.
- Place specs in `testbenches/` (top-level) for combinational and hardware sequential modules.
- The spec types are in `testbenches/tb-spec-types.ts`.

---

## Part 10 — Run the Quality Gate

```bash
bun run quality
```

This runs: TypeScript typecheck → Biome lint → all tests → build. It must report 0 failures.

Optionally simulate the module with the UVM pipeline (requires the toolchain container from Part 3):

```bash
bun run test:uvm
```

---

## Troubleshooting

### `bun run quality` shows test failures after my changes

Run `bun run build` first if you changed any files under `packages/core/`. Stale compiled output causes silent failures.

### Flash fails: "No device found" or `openFPGALoader` exits with an error

1. Confirm the board is in programming mode (S2 + S1 sequence in Part 7).
2. Run `lsusb` — confirm `0403:6010` appears.
3. Check USB permissions: your user must be in the `plugdev` group.
   ```bash
   sudo usermod -aG plugdev $USER
   # then log out and back in
   ```
4. See `docs/guides/programmer-profiles-and-usb-permissions.md` for full diagnostics.

### Board does not blink after power cycle

- Confirm the flash output said "Done" and "Verifying write ... Done".
- Confirm you power-cycled (not just re-plugged): the bitstream loads from flash on power-up.
- Confirm LEDs are active-low: LED value `0x3e` = `0b111110` = LED0 on (bit 0 = 0), all others off.

### Generated SV has wrong port types

- Input ports must be `input logic`, not `input wire logic`. This is controlled by the compiler and should be automatic.
- If you see `wire` in the output, run `bun run build` to flush stale dist files.

---

## What to Explore Next

| Topic                     | Where to look                                                |
| ------------------------- | ------------------------------------------------------------ |
| Add a button              | `examples/hardware/tang_nano_20k/ws2812_demo/ws2812_demo.ts` |
| WS2812 LED strip          | Same file + `docs/guides/ws2812-protocol-and-brightness.md`  |
| Combinational logic       | `examples/adder/adder.ts`, `examples/mux/mux.ts`             |
| ALU with UVM verification | `examples/alu/alu.ts` + `testbenches/uvm/alu.uvm-spec.ts`    |
| nibble4 soft-CPU          | `examples/cpu/nibble4/nibble4_soc.ts`                        |
| Add a new board           | `docs/guides/board-definition-authoring.md`                  |
| Full delivery workflow    | `docs/guides/end-to-end-delivery.md`                         |
