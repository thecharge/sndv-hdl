# Runtime API Reference

This guide covers the full ts2v runtime API: decorators, hardware types, the `HardwareModule` base class, and the `Bits` namespace. It also documents recommended `tsconfig.json` settings and patterns for multi-file module design.

Import everything from `@ts2v/runtime`:

```typescript
import { HardwareModule, Module, Input, Output, Sequential, Combinational,
         Submodule, Assert, ModuleConfig, Param, Bits } from '@ts2v/runtime';
import type { Logic, Bit, Uint8, Uint16, Uint32, LogicArray } from '@ts2v/runtime';
```

---

## HardwareModule

The base class for all synthesisable hardware modules.

```typescript
@Module
class Blinker extends HardwareModule {
  @Input  clk:     Bit = 0;
  @Output led:     Bit = 0;
  counter: Logic<24> = 0;

  @Sequential('clk')
  tick() {
    this.counter = this.counter + 1;
    if (this.counter === 0) this.led = this.led ^ 1;
  }
}
```

**Rules:**
- Every hardware module class must extend `HardwareModule` and be decorated with `@Module`.
- All port declarations must use `@Input` or `@Output`.
- All logic must live inside a `@Sequential` or `@Combinational` method.
- Do not use the ternary operator `?:` — the compiler does not support it.
- Do not use `let` or `var` at module level — use `const` for module-level constants.

---

## Decorators

### `@Module`

Marks a class as a synthesisable hardware module. Emits one `module` declaration per class.

**SV output:**
```systemverilog
module Blinker (input logic clk, output logic led);
  ...
endmodule
```

---

### `@Input`

Marks a class property as an input port.

```typescript
@Input clk: Bit = 0;
@Input data_in: Logic<8> = 0;
```

**SV output:** `input logic clk`, `input logic [7:0] data_in`

---

### `@Output`

Marks a class property as an output port.

```typescript
@Output led: Bit = 0;
@Output result: Logic<16> = 0;
```

**SV output:** `output logic led`, `output logic [15:0] result`

---

### `@Sequential(clock)`

Marks a method as clocked sequential logic.

```typescript
@Input  clk: Bit = 0;
counter: Logic<8> = 0;

@Sequential('clk')
tick() {
  this.counter = this.counter + 1;
}
```

**SV output:**
```systemverilog
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) counter <= 0;
  else counter <= counter + 1;
end
```

- The clock argument must match an `@Input` port name.
- All assignments inside are emitted as non-blocking (`<=`).
- An active-low async reset block (`rst_n`) is injected automatically. Override with `@ModuleConfig`.

---

### `@Combinational`

Marks a method as combinational logic.

```typescript
@Input  a: Logic<8> = 0;
@Input  b: Logic<8> = 0;
@Output sum: Logic<8> = 0;

@Combinational
compute() {
  this.sum = this.a + this.b;
}
```

**SV output:**
```systemverilog
always_comb begin
  sum = a + b;
end
```

- All assignments inside are emitted as blocking (`=`).
- Every output must be assigned on every branch to avoid inferred latches.

---

### `@Submodule`

Marks a property as a submodule instance. The property type must be a `@Module`-decorated class. Ports are connected by name.

```typescript
@Submodule adder: Adder = new Adder();
```

**SV output:**
```systemverilog
Adder adder_inst(.a(a), .b(b), .sum(sum));
```

---

### `@Param`

Marks a property as a synthesisable module parameter (SV `parameter`). A numeric literal initialiser is required.

```typescript
@Param WIDTH: Logic<8> = 8;
@Param DEPTH: Logic<4> = 16;
```

**SV output:**
```systemverilog
#(parameter logic [7:0] WIDTH = 8, parameter logic [3:0] DEPTH = 16)
```

- Parameters are excluded from the port list.
- Only numeric literal initialisers are supported.

---

### `@Assert`

Inline assertion. Emits an SVA `assert property` statement.

```typescript
Assert(this.result < 256, 'result must fit in 8 bits');
```

**SV output:**
```systemverilog
assert property (result < 256) else $fatal(1, "result must fit in 8 bits");
```

---

### `@ModuleConfig`

Overrides module-level compiler settings. Apply before `@Module`.

```typescript
@ModuleConfig('resetSignal: "no_rst"')
@Module
class NoReset extends HardwareModule { ... }
```

Accepted keys:
- `resetSignal: "<name>"` — use a different reset signal (default: `rst_n`)
- `active_high` — reset is active-high (default: active-low)
- `synchronous` — use synchronous reset (default: asynchronous)

---

## Hardware Types

All types are from `@ts2v/runtime`. At the TypeScript level they are branded numbers (or arrays of numbers) — fully assignable from plain `number`/`number[]` and compatible with all arithmetic operators.

### `Logic<N>`

A hardware signal of exactly N bits.

```typescript
signal: Logic<8> = 0;   // logic [7:0] signal
addr:   Logic<16> = 0;  // logic [15:0] addr
```

### `Bit`

A single hardware bit. Equivalent to `Logic<1>`.

```typescript
@Input clk: Bit = 0;  // input logic clk
```

### Convenience aliases

| TypeScript | Width | SV type |
|---|---|---|
| `Bit` | 1 | `logic` |
| `Uint8` | 8 | `logic [7:0]` |
| `Uint16` | 16 | `logic [15:0]` |
| `Uint32` | 32 | `logic [31:0]` |
| `Uint64` | 64 | `logic [63:0]` |
| `Logic<N>` | N | `logic [N-1:0]` |

### `LogicArray<W, SIZE>`

A fixed-size register file of W-bit elements.

```typescript
shift_reg: LogicArray<1, 8>;   // logic [0:0] shift_reg [0:7]
pixels:    LogicArray<24, 8>;  // logic [23:0] pixels [0:7]
```

Both type parameters are required. `SIZE` must be a positive integer literal — the compiler needs a statically known bound.

**Known limitation:** LogicArray indexed sequential access is not supported. Use explicit per-element fields with if/else chains instead.

---

## Bits Namespace

Compiler intrinsics for bit-slice operations. These are runtime no-ops translated by the compiler into SV part-select expressions. Do not declare class properties or local variables named `Bits`.

### `Bits.slice(signal, msb, lsb)`

Extracts bits `[msb:lsb]` from a signal.

```typescript
const low8  = Bits.slice(this.bus, 7, 0);   // -> bus[7:0]
const high8 = Bits.slice(this.bus, 15, 8);  // -> bus[15:8]
```

### `Bits.bit(signal, i)`

Extracts a single bit at index `i`.

```typescript
const msb = Bits.bit(this.data, 7);  // -> data[7]
```

---

## Recommended tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": false
  }
}
```

`experimentalDecorators: true` is required. `emitDecoratorMetadata` must be `false` — ts2v decorators are parsed at compile time and do not use Reflect metadata.

---

## Multi-File Module Design

When a design spans multiple TypeScript files, pass the **directory** to the compiler, not a single file:

```bash
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/my_design \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/my_design
```

The compiler concatenates all `.ts` files in the directory into a single compilation unit. Use a `_constants.ts` file for shared constants:

```
examples/hardware/tang_nano_20k/my_design/
  _constants.ts    # shared consts (WIDTH, DEPTH, etc.)
  top.ts           # top-level module extending HardwareModule
  uart_tx.ts       # submodule used by top.ts
```

All `@Module` classes across all files in the directory are available to each other as submodule types without explicit imports — the compiler merges them before codegen.

**Shared constants file pattern:**

```typescript
// _constants.ts
export const BAUD_RATE = 115200;
export const CLOCK_FREQ_HZ = 27_000_000;
```

Reference constants in any module file in the same directory. The compiler resolves them at codegen time.
