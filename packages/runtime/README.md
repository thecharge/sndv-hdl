# @ts2v/runtime

TypeScript decorators and hardware types for ts2v - the TypeScript-to-SystemVerilog compiler.

Write synthesisable FPGA hardware in modern, type-safe TypeScript. The compiler translates a strict TypeScript subset to IEEE 1800-2017 SystemVerilog.

## Installation

```bash
npm install @ts2v/runtime
# or
bun add @ts2v/runtime
```

## Quick Example

```typescript
import { Module, Input, Output, Sequential, HardwareModule } from '@ts2v/runtime';
import type { Logic, Bit } from '@ts2v/runtime';

@Module
class Blinker extends HardwareModule {
  @Input  clk!: Bit;
  @Input  rst_n!: Bit;
  @Output led!: Logic<6>;

  private counter!: Logic<25>;

  @Sequential('clk')
  tick(): void {
    if (!this.rst_n) {
      this.counter = 0;
      this.led = 0b000001;
    } else {
      this.counter = this.counter + 1;
      if (this.counter === 0) {
        this.led = (this.led << 1) | (this.led >> 5);
      }
    }
  }
}
```

Compile to SystemVerilog:

```bash
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/blinker \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/blinker \
  --flash
```

## Decorators

| Decorator | Target | Description |
|---|---|---|
| `@Module` | Class | Marks a class as a synthesisable hardware module |
| `@Input` | Property | Declares an input port on the module |
| `@Output` | Property | Declares an output port on the module |
| `@Submodule` | Property | Declares an instantiated sub-module |
| `@Sequential(clock)` | Method | Sequential (clocked) always_ff logic block |
| `@Combinational` | Method | Combinational always_comb logic block |
| `@Assert` | Call | Compile-time or simulation assertion |
| `@ModuleConfig(json)` | Class | Attach board-specific port configuration (e.g. clock frequency) |
| `@Param` | Property | Declares a module parameter |

## Hardware Types

All types are TypeScript type aliases - they carry zero runtime overhead and are
erased during synthesis.

| Type | Bit width | Description |
|---|---|---|
| `Logic<N>` | N bits | Unsigned N-bit logic value |
| `Bit` | 1 bit | Single-bit logic (alias for `Logic<1>`) |
| `Uint8` | 8 bits | Alias for `Logic<8>` |
| `Uint16` | 16 bits | Alias for `Logic<16>` |
| `Uint32` | 32 bits | Alias for `Logic<32>` |
| `Uint64` | 64 bits | Alias for `Logic<64>` |
| `LogicArray<W, SIZE>` | W*SIZE bits | Array of W-bit logic values |

## HardwareModule

All hardware modules must extend `HardwareModule`:

```typescript
import { HardwareModule, Module, Input, Output } from '@ts2v/runtime';

@Module
class MyModule extends HardwareModule {
  // ...
}
```

## Bits Namespace

Utility functions for bit manipulation in combinational logic:

```typescript
import { Bits } from '@ts2v/runtime';

const high4 = Bits.slice(value, 7, 4);   // bits [7:4]
const low4  = Bits.slice(value, 3, 0);   // bits [3:0]
const concat = Bits.concat(high4, low4); // {high4, low4}
```

## Supported TypeScript Subset

The compiler supports a strict subset of TypeScript. Key restrictions:

- No ternary operator `?:` - use `if/else`
- No `let` or `var` at module level - use `const`
- No magic numbers - define a `const` for every literal used in logic
- Import from `@ts2v/runtime`, not `ts2sv`

See [CLAUDE.md](../../CLAUDE.md) in the repository for the full constraint list.

## OSS Toolchain

Synthesis requires the open-source toolchain container (Yosys + nextpnr + gowin_pack + openFPGALoader). No Quartus, Vivado, or proprietary tools required.

```bash
# Build the container image (one-time setup)
bun run toolchain:image:build
```

## License

MIT. See [LICENSE](../../LICENSE).
