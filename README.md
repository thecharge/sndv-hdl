# ts2v — TypeScript to SystemVerilog Compiler

**IEEE 1800-2017 compliant.** Write hardware in TypeScript. Get synthesizable SystemVerilog.

```
ts2v build cpu/ts/ --out cpu/build/ --board configs/tang_nano_9k.board.json
```

| Metric | Value |
|--------|-------|
| Tests | 392 passing |
| CPU Arch | nibble4 (4-bit, dual-core) |
| Board Support | Gowin, Xilinx, Intel, Lattice |
| Output | `always_ff`, `always_comb`, `typedef enum`, `case` |
| Reset | Async (negedge rst_n) + Sync + Active-high (posedge) |
## What Compiles

The compiler handles two modes:

**Class Mode** (spec §3-§4): `@Module` classes with `@Sequential`, `@Combinational` decorators.

```typescript
enum State { IDLE, RUN, DONE }

class Counter extends Module {
  @Input  clk: Logic<1>;
  @Input  enable: Logic<1>;
  @Output count: Logic<8> = 0;      // "= 0" becomes reset value
  private state: Logic<2> = 0;

  @Sequential(clk)                   // → always_ff @(posedge clk or negedge rst_n)
  update() {
    if (this.enable) {
      this.count = this.count + 1;   // → count <= count + 1  (non-blocking)
    }
    switch (this.state) {
      case State.IDLE: this.state = State.RUN; break;
      case State.RUN:  this.state = State.DONE; break;
    }
  }

  @Combinational                     // → always_comb
  status() {
    this.count = this.state === State.DONE;  // → count = (state == DONE)
  }
}
```

**Function Mode** (combinational logic): Pure functions → Verilog `module` with `assign` statements.

```typescript
export function alu(a: number, b: number, op: number): number {
  if (op === 0) { return a + b; }
  if (op === 1) { return a - b; }
  return a & b;
}
```
## Translation Rules

| TypeScript | SystemVerilog | Spec § |
|---|---|---|
| `class X extends Module` | `module X (...)` | §3.1 |
| `@Input prop: Logic<N>` | `input wire logic [N-1:0] prop` | §3.2 |
| `@Output prop: Logic<N> = V` | `output logic [N-1:0] prop` + reset to V | §3.2, §52 |
| `private prop: Logic<N> = V` | `logic [N-1:0] prop` + reset to V | §3.1 |
| `private readonly C = V` | `localparam C = V` | §3.1 |
| `@Sequential(clk)` | `always_ff @(posedge clk or negedge rst_n)` | §4.2, §52 |
| `@Combinational` | `always_comb` | §4.1 |
| `this.x = expr` (in `@Sequential`) | `x <= expr` (non-blocking) | §4.3 |
| `this.x = expr` (in `@Combinational`) | `x = expr` (blocking) | §4.3 |
| `enum State { A, B, C }` | `typedef enum logic [1:0] { A=0, B=1, C=2 } State` | §9.1 |
| `switch (this.state)` | `case (state)` | §10.2 |
| `this.a === this.b` | `a == b` | - |
| `~this.a` | `~a` | - |
| `this.count++` | `count <= count + 1` | - |
| Property init `= 0` | Reset value in `if (!rst_n)` block | §52.1 |
## Reset Handling (Spec §52)

Property initialization doubles as reset value. The compiler auto-injects `rst_n` and generates the reset block.

**Default: async active-low** (industry standard for FPGAs)
```systemverilog
always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
        count <= 8'd0;    // from "= 0" in TypeScript
        state <= 2'd0;
    end else begin
        // user logic
    end
end
```

**Active-high reset** (via `@ModuleConfig`):
```typescript
@ModuleConfig({ resetSignal: "sys_rst", resetPolarity: "active_high", resetType: "async" })
class M extends Module { ... }
```
Generates: `always_ff @(posedge clk or posedge sys_rst)`

**Synchronous reset** (via `@ModuleConfig`):
```typescript
@ModuleConfig({ resetType: "synchronous" })
class M extends Module { ... }
```
Generates: `always_ff @(posedge clk)` with synchronous reset check inside.

All three variants are tested (see `tests/cpu-compile.test.ts`).
## nibble4 CPU (Penalty Deliverable)

A 4-bit dual-core CPU written in TypeScript, compiled through ts2v to synthesizable SystemVerilog.

### Architecture

- **Data path:** 4-bit (nibble)
- **Registers:** R0-R3 (4-bit each), PC (8-bit), flags Z/C
- **Instruction:** 8-bit (4-bit opcode + 4-bit operand)
- **Cores:** 2 (shared RAM via round-robin arbiter)
- **Peripherals:** UART TX (115200 8N1), LED output, hardware mutex, timer

### ISA (16 instructions)

| Op | Name | Encoding | Action |
|----|------|----------|--------|
| 0 | NOP | `0x 0r` | No operation |
| 1 | LDI | `1r imm` | R[r] = imm |
| 2 | LD  | `2x 00` | R0 = MEM[R0] |
| 3 | ST  | `3x 00` | MEM[R0] = R1 |
| 4 | ADD | `4x 00` | R0 = R0 + R1, set Z/C |
| 5 | SUB | `5x 00` | R0 = R0 - R1, set Z/C |
| 6 | AND | `6x 00` | R0 = R0 & R1 |
| 7 | OR  | `7x 00` | R0 = R0 \| R1 |
| 8 | XOR | `8x 00` | R0 = R0 ^ R1 |
| 9 | NOT | `9x 00` | R0 = ~R0 |
| A | SHL | `Ax 00` | R0 = R0 << 1, C = MSB |
| B | SHR | `Bx 00` | R0 = R0 >> 1, C = LSB |
| C | JMP | `Cx addr`| PC = addr |
| D | JZ  | `Dx addr`| if Z: PC = addr |
| E | OUT | `Ex 00` | PERIPH[0xF0+R1] = R0 |
| F | HLT | `Fx 00` | Halt |

### Source Files

| File | What |
|------|------|
| `cpu/ts/nibble4_core.ts` | CPU core (TypeScript) |
| `cpu/ts/nibble4_soc.ts` | Arbiter + Memory + UART (TypeScript) |
| `cpu/build/nibble4_core.sv` | Generated SystemVerilog (282 lines) |
| `cpu/build/nibble4_soc.sv` | Generated SystemVerilog (252 lines) |
| `cpu/build/tb_nibble4_core.sv` | Testbench (exercises LDI+ADD, JZ, AND) |

### Compile

```bash
npx ts-node src/cli.ts build cpu/ts/ --out cpu/build/ --board configs/tang_nano_9k.board.json
```

### Simulate (iverilog)

```bash
iverilog -g2012 -o sim.vvp cpu/build/nibble4_core.sv cpu/build/tb_nibble4_core.sv
vvp sim.vvp
```
## Board Support (Spec §62)

The compiler generates vendor-specific constraint files from `board.json`.

```bash
npx ts-node src/cli.ts build src/ --out build/ --board configs/tang_nano_9k.board.json  # → .cst
npx ts-node src/cli.ts build src/ --out build/ --board configs/arty_a7.board.json       # → .xdc
npx ts-node src/cli.ts build src/ --out build/ --board configs/de10_nano.board.json     # → .qsf
```

### Supported Vendors

| Vendor | Format | Config Key |
|--------|--------|------------|
| Gowin (Tang Nano) | `.cst` | `"vendor": "gowin"` |
| Xilinx (Vivado) | `.xdc` | `"vendor": "xilinx"` |
| Intel (Quartus) | `.qsf` | `"vendor": "intel"` |
| Lattice (Diamond) | `.lpf` | `"vendor": "lattice"` |

### Board Config Format

```json
{
  "board": {
    "vendor": "gowin",
    "family": "GW1NR",
    "part": "GW1NR-LV9QN88PC6/I5",
    "pins": {
      "sys_clk": "52",
      "uart_tx": "17",
      "led_0": "10"
    },
    "io_standard": "LVCMOS33"
  }
}
```

### Generated Output (Gowin .cst)

```
IO_LOC "sys_clk" 52;
IO_PORT "sys_clk" IO_TYPE=LVCMOS33;
IO_LOC "uart_tx" 17;
IO_PORT "uart_tx" IO_TYPE=LVCMOS33;
```
## Project Structure

```
ts2v-work/
├── src/
│   ├── cli.ts                          # Build CLI (ts2v build)
│   ├── class-compiler/
│   │   └── class-module-compiler.ts    # @Module class → SV pipeline
│   ├── lexer/
│   │   ├── lexer.ts                    # Tokenizer (class, enum, @, this, switch...)
│   │   ├── char-reader.ts
│   │   └── token.ts
│   ├── parser/
│   │   ├── parser.ts                   # Function-mode parser
│   │   ├── expression-parser.ts
│   │   └── ast.ts
│   ├── typechecker/
│   │   ├── typechecker.ts
│   │   └── hardware-type.ts
│   ├── codegen/
│   │   ├── verilog-emitter.ts          # Function-mode emitter
│   │   └── expression-emitter.ts
│   ├── constraints/
│   │   └── board-constraint-gen.ts     # board.json → .cst/.xdc/.qsf/.lpf
│   ├── errors/
│   │   └── compiler-error.ts
│   └── constants/
│       └── strings.ts
├── tests/
│   ├── lexer.test.ts                   # 54 tests
│   ├── parser.test.ts                  # 44 tests
│   ├── typechecker.test.ts             # 38 tests
│   ├── codegen.test.ts                 # 73 tests
│   ├── integration.test.ts             # 36 tests
│   ├── class-compiler.test.ts          # 18 tests
│   ├── cpu-compile.test.ts             # 22 tests
│   ├── golden.test.ts                  # 78 tests
│   └── lint.test.ts                    # 29 tests
├── cpu/
│   ├── ts/                             # CPU source (TypeScript)
│   │   ├── nibble4_core.ts             # 4-bit CPU core
│   │   ├── nibble4_soc.ts              # Arbiter + Memory + UART
│   │   └── nibble4_dual_soc.ts         # Dual-core top
│   └── build/                          # Generated SystemVerilog
│       ├── nibble4_core.sv             # 282 lines
│       ├── nibble4_soc.sv              # 252 lines
│       └── tb_nibble4_core.sv          # Testbench
├── configs/
│   ├── tang_nano_9k.board.json         # Gowin GW1NR-9C
│   ├── arty_a7.board.json              # Xilinx Artix-7
│   └── de10_nano.board.json            # Intel Cyclone V
├── examples/                           # 10 TypeScript hardware designs
│   ├── blinker.ts, uart_tx.ts, pwm.ts, alu.ts, ...
└── package.json
```
## Testing

```bash
# Run all 392 tests
npm test

# Run specific test suites
npx ts-node --test tests/class-compiler.test.ts   # Class module compiler (18 tests)
npx ts-node --test tests/cpu-compile.test.ts       # CPU compilation (22 tests)
npx ts-node --test tests/lexer.test.ts             # Lexer (54 tests)
npx ts-node --test tests/codegen.test.ts           # Code generation (73 tests)
npx ts-node --test tests/golden.test.ts            # Golden output comparison (78 tests)
npx ts-node --test tests/lint.test.ts              # Verilator lint (29 tests)
```

### Test Categories

| Suite | Count | What it verifies |
|-------|-------|------------------|
| Lexer | 54 | Tokenization of class, enum, @, this, switch, ++, +=, ! |
| Parser | 44 | AST construction for functions |
| TypeChecker | 38 | Bit-width inference, type compatibility |
| CodeGen | 73 | Verilog emission (function mode) |
| ClassCompiler | 18 | @Module class → always_ff/always_comb, enums, ports, reset |
| CPU Compile | 22 | nibble4 TS → SV (core, SoC), reset polarity, ISA verification |
| Golden | 78 | Byte-exact output comparison against reference files |
| Integration | 36 | End-to-end TS file → SV file |
| Lint | 29 | Generated SV passes structural checks |
## IEEE 1800-2017 Compliance

Every generated file includes:

```systemverilog
`timescale 1ns / 1ps          // Clause 22: Time precision
`default_nettype none          // Safety: catch undeclared nets
// ... module body ...
`default_nettype wire          // Restore default
```

### Compliance Checklist (Spec §8)

| Requirement | Status |
|-------------|--------|
| Explicit `timeunit`/`timeprecision` | ✅ `timescale 1ns/1ps` |
| ANSI port style | ✅ `module X (input wire logic ...)` |
| `always_comb` / `always_ff` only (no generic `always`) | ✅ |
| Non-blocking in sequential, blocking in combinational | ✅ |
| `typedef enum logic [W-1:0]` with explicit sizing | ✅ |
| `case`/`endcase` with `default` | ✅ |
| No vendor-specific pragmas | ✅ |

### What's Not Yet Implemented

| Feature | Spec Section | Status |
|---------|-------------|--------|
| Module hierarchy (`new Child()`) | §3.3 | Planned |
| `async/await` FSM inference | §5 | Partial (while loops recognized) |
| SystemVerilog `class` (verification) | §5.1 | Planned |
| UVM-Lite layer | §25 | Planned |
| SVA assertions | §17 | Planned |
| Clock domain crossing checks | §26 | Planned |
| DPI-C bridge generation | §18 | Planned |
| Pipeline operator (`\|>`) | §61 | Planned |
