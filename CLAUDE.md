# CLAUDE.md - ts2v Project Context

This file gives AI assistants (Claude, Copilot, Cursor, etc.) the context needed to work
productively in this repository without asking repeated orientation questions.

## What This Repo Is

**ts2v** - a TypeScript-to-SystemVerilog compiler and FPGA toolchain.

You write hardware modules as TypeScript classes with decorators. The compiler translates
them to IEEE 1800-2017 SystemVerilog. A containerised toolchain (Yosys, nextpnr,
openFPGALoader) synthesises, place-and-routes, and flashes the result to real FPGA hardware.

The primary target is the Tang Nano 20K (Gowin GW2AR-18C, 27 MHz clock, 6 onboard LEDs,
WS2812 on pin 79). All tooling is open-source - no Vivado/Quartus required.

## Key Commands

```bash
# Build all packages (REQUIRED after any change to packages/core/)
bun run build

# Run all quality gates (typecheck + lint + test + build)
bun run quality

# Run focused compiler regression tests
bun run test:root

# Compile a hardware example (single file)
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/blinker/blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/blinker

# Compile a multi-file hardware example (pass the directory)
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/ws2812_demo \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/ws2812_demo

# Compile + flash to Tang Nano 20K (no sudo needed)
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/aurora_wave \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/aurora_wave \
  --flash

# Examples with hw/ + client/ split: compile the hw/ subdirectory only
# (the client/ folder contains Bun scripts, NOT hardware source)
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/aurora_uart/hw \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/aurora_uart \
  --flash

bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/calc_uart/hw \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/calc_uart \
  --flash

# Or use the convenience scripts in each example folder
./examples/hardware/tang_nano_20k/aurora_uart/flash.sh
./examples/hardware/tang_nano_20k/aurora_uart/run.sh          # default /dev/ttyUSB1
./examples/hardware/tang_nano_20k/calc_uart/flash.sh
./examples/hardware/tang_nano_20k/calc_uart/run.sh

# Run UVM-style container simulation
bun run test:uvm
```

## TypeScript Subset - Class Compiler (Primary Mode)

### Decorators

| Decorator | Purpose | Notes |
|-----------|---------|-------|
| `@Module` | Marks a synthesisable hardware class | Required on every module |
| `@ModuleConfig(str)` | Compiler config string | e.g. `'resetSignal: "no_rst"'` |
| `@Input` | Declares an input port | `@Input clk: Bit = 0;` |
| `@Output` | Declares an output port | `@Output led: Logic<6> = 0x3F;` |
| `@Sequential('clk')` | `always_ff @(posedge clk)` block | Non-blocking assignments |
| `@Combinational` | `always_comb` block | Blocking assignments |
| `@Submodule` | Instantiates a child module | Auto-wired by name matching |
| `@Assert(cond, msg)` | Concurrent SVA assertion | Emits `assert property` |

### Types

| TypeScript | SystemVerilog | Notes |
|------------|--------------|-------|
| `Logic<N>` | `logic [N-1:0]` | N-bit signal - primary type |
| `Bit` | `logic` | 1-bit alias |
| `UintN` / `UIntN` | `logic [N-1:0]` | Tested up to >64 bits |
| `LogicArray<W,S>` | Register file | Declared OK; indexed sequential access is a KNOWN LIMITATION (see below) |

### Module Structure Pattern

```typescript
import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Submodule } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const MY_CONST = 42;

@Module
@ModuleConfig('resetSignal: "no_rst"')  // omit to get auto-reset injection
class MyModule extends HardwareModule {
    @Input  clk: Bit      = 0;
    @Input  btn: Bit      = 0;
    @Output led: Logic<6> = 0x3F;

    private counter: Logic<24> = 0;

    @Sequential('clk')
    tick(): void {
        this.counter = this.counter + 1;
        if (this.counter === 0) {
            this.led = this.led + 1;
        }
    }
}

export { MyModule };
```

### Supported Constructs in @Sequential / @Combinational

**CONFIRMED WORKING:**
- `if / else if / else` with braces
- `if / else` without braces (single statement)
- `switch / case / default / break` - emits `case(...) endcase`
- `enum` at top level - emits `typedef enum logic [N:0] { ... }`
- Private helper methods - inlined at call site (no function calls in SV output)
- Early `return` - converted to `if/else` chain by compiler
- Arithmetic: `+`, `-`, `*`
- Bitwise: `&`, `|`, `^`, `~`
- Shift: `<<`, `>>` (logical), `>>>` (arithmetic)
- Comparison: `===`, `!==`, `<`, `>`, `<=`, `>=`
- `let` / `const` locals inside methods - promoted to module-level `logic` registers
- `this.x` property access - `this.` prefix stripped in output
- Constants (`const` at file level) - inlined by compiler
- Auto-reset injection: when `@ModuleConfig` omits `no_rst`, async active-low `rst_n` is auto-injected
- Complex arithmetic expressions in assignments: `((a * 3) << 16) | ((b - c) * 3)` compiles cleanly
- Multiple `if` blocks in same `@Sequential` (non-mutually-exclusive): last assignment wins (SV non-blocking semantics)

**NOT SUPPORTED / FORBIDDEN:**
- Ternary operator `? :` - compiler does not handle it
- `let` / `var` at module level - use `const` only
- Magic numbers in logic - always name them with `const`
- `wire` in generated SV - only `logic`
- `'ts2sv'` import alias - use `'@ts2v/runtime'`
- Cross-module free function calls from `@Sequential` - inline via helper method
- Template literals, strings, class generics at runtime
- `let` with the same name in multiple helper methods - they collide when inlined (all become module-level `logic`). Use unique names or avoid `let` in helpers entirely; reference `this.X` registers directly.

**UNCERTAIN / TEST BEFORE USING:**
- `||` and `&&` in conditions - use nested `if` or separate checks when unsure
- Complex switch expression (non-signal) - use a register intermediary

### Enum Pattern

```typescript
enum FsmState { IDLE = 0, RUNNING = 1, DONE = 2 }
// Emits: typedef enum logic [1:0] { IDLE = 2'd0, RUNNING = 2'd1, DONE = 2'd2 } FsmState;
```

Bit width is computed automatically from the number of members.

### Multi-File Compilation

Pass the directory, not a single file. All `.ts` files in the directory are compiled together.
Imports are stripped before concatenation - they serve only TypeScript tooling purposes.

```bash
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/ws2812_demo \
  --board boards/tang_nano_20k.board.json --out .artifacts/ws2812_demo
```

### Submodule Auto-Wiring

Ports are matched by name. Any `private` signal or `@Input`/`@Output` in the parent module
with the same name as a child module port is auto-connected:

```typescript
private frame: Logic<24> = 0;     // auto-wired: gen.frame -> serialiser.frame
@Submodule gen        = new RainbowGen();
@Submodule serialiser = new Ws2812Serialiser();
```

### Reset Injection

By default the compiler injects an async active-low reset:
```systemverilog
always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin /* default values */ end
    else begin /* your logic */ end
end
```

To disable: `@ModuleConfig('resetSignal: "no_rst"')`. Use this when `rst_n` or `btn` are
plain inputs driving logic (not hardware reset), as in the WS2812 and aurora demos.

### Helper Method Inlining

Private methods are inlined at call sites. This is how the compiler handles
"calling a function from sequential logic" - the body is pasted in place.

Because all assignments in `always_ff` are non-blocking, when a helper that sets
`this.shiftReg` is called AFTER `this.pixelIdx = this.pixelIdx + 1`, the helper sees
the OLD `pixelIdx` value (pre-increment). Design your helpers with this in mind - this
property is often USEFUL (e.g. "load pixel[old_index + 1]").

### ModuleConfig Options

```typescript
@ModuleConfig('resetSignal: "no_rst"')          // disable reset
@ModuleConfig('active_high')                    // active-high reset (default: active_low)
@ModuleConfig('synchronous')                    // sync reset (default: async)
@ModuleConfig('resetSignal: "srst", active_high, synchronous')  // combined
```

## Tang Nano 20K Board Reference

**File:** `boards/tang_nano_20k.board.json`

| Signal | Pin | Notes |
|--------|-----|-------|
| `clk` | 4 | 27 MHz oscillator |
| `rst_n` | 88 | S1 button, active-HIGH (pull-down at rest; press = 1) |
| `btn` | 87 | S2 button, active-HIGH (pull-down at rest; press = 1) |
| `led[0..5]` | 15-20 | Active-LOW (0 = ON, 1 = OFF); all-off = `0x3F` |
| `ws2812` | 79 | WS2812 data line (3.3V LVCMOS) |
| `uart_tx` | 15 | UART transmit |
| `uart_rx` | 16 | UART receive |

**Active-low LED values (6 bits):**
```
LED_0_ON = 0x3E (0b111110)    LED_1_ON = 0x3D    LED_2_ON = 0x3B
LED_3_ON = 0x37               LED_4_ON = 0x2F    LED_5_ON = 0x1F
ALL_OFF  = 0x3F
```

## Known Compiler Limitations (Gap List)

These are documented gaps. Do NOT try to use these patterns - they require compiler changes.
Use the workarounds shown.

### 1. No LogicArray indexed access in sequential logic

**What you want:**
```typescript
private pixels: LogicArray<24, 8>;
this.pixels[this.idx] = newColor;
```

**Workaround (21 sites in USB PD code):** Explicit registers + if/else chain:
```typescript
private pixel0: Logic<24> = 0;
private pixel1: Logic<24> = 0;
// ...
if (this.idx === 0) { this.pixel0 = newColor; }
else if (this.idx === 1) { this.pixel1 = newColor; }
// ...
```

### 2. No cross-module combinational function calls

Calling a free function (or another module's method) from `@Sequential` / `@Combinational`
is not supported. The compiler only inlines methods defined in the SAME class.

**Workaround:** Duplicate the table or copy the logic into a private helper in each module,
OR instantiate a `@Submodule` that wraps the combinational function.

### 3. No parameterised modules

Generic type parameters (`class Encoder<CLK: number, BAUD: number>`) are parsed but not
compiled to SV `parameter` declarations. Constants are shared via a separate `_constants.ts`
file and must be edited manually for different board frequencies.

**Workaround:** Import constants from a shared file; accept hard-coding for now.

### 4. No `@InOut` / tristate I/O

The CC line in USB PD is bidirectional. Only `@Input` and `@Output` exist.

**Workaround:** Split into separate `cc_in: @Input` and `cc_out: @Output` ports; add
external mux in constraints or board schematic.

### 5. No multi-clock domain / CDC annotations

No `@AsyncReg` or multi-clock `@Sequential`. Two-stage synchronisers work syntactically
but the compiler emits no `(* ASYNC_REG *)` attributes.

**Workaround:** Write the synchroniser registers manually; document the CDC crossing.

### 6. No bit-slice intrinsics

`Bits.slice(signal, hi, lo)` is not yet implemented. Use shift-and-mask:
```typescript
const msgType = this.header & 0x1F;         // bits [4:0]
const msgId   = (this.header >> 9) & 0x7;   // bits [11:9]
```

### 7. No `@Assert` formal properties (SVA)

`@Assert(condition)` emits `assert property` but the runtime does not yet support
full SVA temporal operators (`##`, `|->`, sequences, etc.).

### 8. Enum in FSMs - CONFIRMED WORKING (with naming caveat)

Use `enum` freely. The compiler emits `typedef enum logic [N:0]` with sized literals.
The `switch/case` on enum values also works. This is the recommended FSM state encoding.

**CRITICAL:** All enum member names must be globally unique across ALL enums in a
multi-file design. The compiler emits every `typedef enum` at file scope (not inside
the module block), so two enums sharing a member name (e.g. both having `IDLE`, `DATA`)
cause a Yosys synthesis error: `enum item IDLE already exists`.

**Fix:** Prefix member names by enum type: `RX_IDLE`, `TX_IDLE`, `RX_DATA`, `TX_DATA`, etc.

```typescript
// BAD - both enums have IDLE and DATA:
enum RxSt { IDLE = 0, START = 1, DATA = 2, STOP = 3 }
enum TxSt { IDLE = 0, STARTB = 1, DATA = 2, STOPB = 3 }

// GOOD - prefixed to ensure global uniqueness:
enum RxSt { RX_IDLE = 0, RX_START = 1, RX_DATA = 2, RX_STOP = 3 }
enum TxSt { TX_IDLE = 0, TX_STARTB = 1, TX_DATA = 2, TX_STOPB = 3 }
```

### 9. Multiple `@Submodule` instances of the same class

Not verified. If you need two instances of `PdCrc32`, test it first; the emitter MAY
fail to disambiguate port connections by name when two instances share the same port names.

**Workaround:** Rename ports in one copy of the module (subclass or copy the file).

## File Layout Rules

- Hardware examples: `examples/hardware/<board>/<name>/` (one folder per example)
- Simulation examples: `examples/<name>/`
- Testbench specs (TypeScript only): `testbenches/*.tb-spec.ts`
- Generated SV testbenches: `.artifacts/` (never committed, never hand-written)
- Board definitions: `boards/<name>.board.json`
- Compiler source: `packages/core/src/compiler/`
- Runtime types/decorators: `packages/runtime/src/`

## Testing

```bash
# Unit tests (fast, no hardware)
bun run test:root          # tests/class-compiler.test.ts etc.

# UVM-style simulation (requires Podman + toolchain image)
bun run test:uvm

# Compile the default example as a sanity check
bun run compile:example
```

Testbench specs live in `testbenches/` as TypeScript files implementing `SeqTestSpec` or
`CombTestSpec` from `testbenches/tb-spec-types.ts`. Never write raw `.sv` testbenches.

## Forbidden Patterns (from AGENTS.md)

- `->` arrow must be `->` in comments/docs (not `→`)
- Em-dash ` - ` must be ` - ` (not `—`)
- No `// -- Label -----` separator comments
- No ternary `?:` in hardware source
- No `let`/`var` at module level (use `const`)
- No magic numbers in logic (name everything with `const`)
- No `'ts2sv'` import alias (use `'@ts2v/runtime'`)
- No raw `.sv` testbench files (TypeScript specs only)
- Multi-file designs: compile the directory, not a single `.ts` file

## DX Guidance for AI Assistants

When asked to write a new hardware example:
1. Read an existing example first (ws2812_demo, breathe, knight_rider).
2. Use `@ModuleConfig('resetSignal: "no_rst"')` for demos that use buttons as plain inputs.
3. Name all constants at the top of the file. Never inline numbers.
4. Use `switch/case` for FSMs and palette lookups - it compiles to clean SV `case`.
5. Use `enum` for FSM state encoding.
6. Use private helper methods for repeated logic blocks - they get inlined.
7. Remember non-blocking assignment semantics: the RHS sees old register values.
   When a helper is called after a register update, it reads the PRE-update value.
   This is a FEATURE for "load next element" patterns.
8. For multi-pixel WS2812 drivers: use explicit `pixel0..pixelN` registers + if/else
   chain for selection (LogicArray limitation workaround).
9. After any compiler change: `bun run build` before compiling examples.
10. Add every new hardware example to `README.md` docs index and append a note to
    `docs/append-only-engineering-log.md`.

## WS2812 Protocol Summary

- GRB byte order: `frame[23:16]` = Green, `[15:8]` = Red, `[7:0]` = Blue
- Timing at 27 MHz (1 clk = 37 ns):
  - T0H = 9 clks (333 ns), T1H = 19 clks (703 ns), bit period = 30 clks (1111 ns)
  - Reset pulse = 10000 clks (370 µs) - the onboard WS2812C-2020 requires >280 µs
- To drive N pixels: send N consecutive 24-bit frames, then send the reset pulse
- No gap needed between pixel frames; the reset pulse latches all pixels simultaneously

## Smooth HSV Colour Model (aurora_wave / aurora_uart)

Piecewise-linear HSV maps an 8-bit hue (0..255) to GRB using 3 segments of 85 steps.
Channel ramp = hue_offset * 3 (max 252). GRB format: G=[23:16] R=[15:8] B=[7:0].

| Segment | Condition | G | R | B |
|---------|-----------|---|---|---|
| 0 | h < 85   | h*3 (up)      | (84-h)*3 (down) | 0          |
| 1 | h < 170  | (169-h)*3 (dn)| 0               | (h-85)*3 (up) |
| 2 | h >= 170 | 0             | (h-170)*3 (up)  | (254-h)*3 (dn)|

Full rainbow revolution at PHASE_NORMAL=1: 256 steps * 2^20 clocks = ~9.9 s at 27 MHz.

## UART on Tang Nano 20K

The FTDI2232H on the Sipeed debugger board provides a UART bridge.
- RX pin: 16 (`uart_rx` in board JSON) -- also `led[1]` -- cannot use both
- TX pin: 15 (`uart_tx` in board JSON) -- also `led[0]` -- cannot use both
- Baud rate: 115200 8N1 (BIT_PERIOD = 234 clocks at 27 MHz, <0.2% error)
- `/dev/ttyUSB0` is the JTAG port (for programming only, not for data)
- `/dev/ttyUSB1` is the UART data port **when Tang Nano is the only USB serial device**
- **If another USB serial device is present**, the UART port may be `/dev/ttyUSB2` or higher.
  Always run `ls /dev/ttyUSB*` first -- the JTAG port is the lower number, UART is the higher.
- Port access: `sudo chmod a+rw /dev/ttyUSBN` for one session, or `sudo usermod -aG dialout $USER` permanently (takes effect after next login)
- No sudo needed for flashing (only for port access if not in the dialout group)
- Reference implementations: `examples/hardware/tang_nano_20k/aurora_uart/hw/` and `examples/hardware/tang_nano_20k/calc_uart/hw/`
- Full serial debugging guide: `docs/guides/uart-serial-debugging.md`

### Bun serial I/O pattern (no serialport package)
The `serialport` npm package crashes in Bun. Use raw `fs` calls with this pattern:
1. `openSync(PORT, O_RDWR | 0o4000 | 0o400)` -- O_NONBLOCK + O_NOCTTY
2. `spawnSync("stty", ["-F", PORT, "115200", "raw", "cs8", "-cstopb", "-parenb", "clocal", "cread", "-echo", "-crtscts"])`
3. Open MUST come before stty -- FTDI driver reinitializes baud rate on open if stty ran first with no open fd
4. `readSync` on O_NONBLOCK returns 0 when no data; use `Bun.sleepSync(10)` between retries

### Hardware test (Python)
```bash
python3 -c "import serial; s=serial.Serial('/dev/ttyUSB1',115200,timeout=2); s.write(bytes([0,42,13])); r=s.read(2); print((r[0]<<8|r[1]) if len(r)==2 else 'TIMEOUT'); s.close()"
```
Expected for calc_uart add(42,13): `55`. Use this to confirm the FPGA responds before
debugging the Bun client.

## hw/ + client/ Directory Split

Examples with both hardware and a PC client are split into two subdirectories:
- `hw/` - TypeScript hardware source files. **Compile only this directory.**
- `client/` - Bun/Node scripts for the PC side. **Never compiled as hardware.**

This split exists because the compiler processes all `.ts` files it finds in the given
directory. If client scripts (which import Node APIs) were in the same directory as
hardware source, the compiler would try to compile them as hardware and fail.

**Always pass `hw/` to the compiler for these examples:**
```bash
# Correct:
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/aurora_uart/hw ...

# Wrong - includes client scripts in the hardware compilation:
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/aurora_uart ...
```

## Confirmed Flash History

- blinker: confirmed flashed, Tang Nano 20K (Winbond W25Q64)
- ws2812_demo: confirmed flashed, Tang Nano 20K
- aurora_wave: confirmed flashed, Tang Nano 20K
- aurora_uart: confirmed compiled; flash with `./examples/hardware/tang_nano_20k/aurora_uart/flash.sh`
- calc_uart: confirmed compiled; flash with `./examples/hardware/tang_nano_20k/calc_uart/flash.sh`

## Package Responsibilities

| Package | Owns |
|---------|------|
| `packages/core` | TypeScript->SV compiler, constraint generator |
| `packages/runtime` | `@Module`, `@Input`, `@Output`, `Logic<N>` etc. (decorator no-ops + types) |
| `packages/toolchain` | Yosys / nextpnr / gowin_pack / openFPGALoader adapters |
| `packages/config` | Board definition loading, workspace config |
| `packages/process` | Process execution abstraction |
| `packages/types` | Shared interfaces between packages |
| `apps/cli` | CLI argument parsing + command dispatch |
