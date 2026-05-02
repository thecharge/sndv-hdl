# Formal Verification with @Assert and @Assume

ts2v supports lightweight formal verification via SVA (SystemVerilog Assertions) and SymbiYosys.
Annotate a hardware module with `@Assert` or `@Assume` class decorators; the compiler automatically
generates both the SVA `assert property` / `assume property` statements and a ready-to-run
SymbiYosys `.sby` configuration file.

## Quick Start

```typescript
import { HardwareModule, Module, ModuleConfig, Input, Output, Sequential, Assert, Assume } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

const MAX_COUNT = 15;

@Assert(() => this.counter <= MAX_COUNT, 'counter_in_range')
@Assume(() => this.clk === 0 || this.clk === 1)
@Module
@ModuleConfig('resetSignal: "no_rst"')
class Counter extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output counter: Logic<4> = 0;

    @Sequential('clk')
    tick(): void {
        this.counter = this.counter + 1;
    }
}
```

Compile:

```bash
bun run apps/cli/src/index.ts compile counter.ts --out .artifacts/counter
# → .artifacts/counter/counter.sv   (SystemVerilog with SVA)
# → .artifacts/counter/counter.sby  (SymbiYosys config)
```

Run formal verification (requires toolchain image):

```bash
bun run verify .artifacts/counter/counter.sby
# [verify] PASS: counter — all properties hold at depth 20
```

## Decorators

### @Assert

```typescript
@Assert(() => <condition>)
@Assert(() => <condition>, 'label')
```

Emits a concurrent SVA `assert property` clocked on the module's sequential clock.
The condition is checked at every rising clock edge within the BMC depth. Violation
causes a `$error("label")` in simulation and a `FAIL` from `bun run verify`.

### @Assume

```typescript
@Assume(() => <condition>)
@Assume(() => <condition>, 'label')
```

Emits a concurrent SVA `assume property`. Assumptions constrain the formal solver's
input space — the solver is not allowed to explore states where the assumption is
false. Use `@Assume` to restrict unbounded inputs to legal ranges.

## Generated SystemVerilog

The compiler emits all assertions after the last `always_ff` block, inside the
module body:

```systemverilog
// SystemVerilog Assertions (IEEE 1800-2017 SVA)
assert_0: assert property (@(posedge clk) counter<=15)
    else $error("counter_in_range");
assume_1: assume property (@(posedge clk) clk==0||clk==1);
```

Labels are numbered `assert_N` / `assume_N` in declaration order.

## Generated .sby File

When any `@Assert` or `@Assume` is present the compiler writes a SymbiYosys config
alongside the `.sv` output:

```ini
[options]
mode bmc
depth 20

[engines]
smtbmc

[script]
read -formal counter.sv
prep -top Counter

[files]
counter.sv
```

The default mode is `bmc` (bounded model checking) with depth 20 clock cycles.

## bun run verify

```bash
bun run verify <path/to/design.sby>
```

Invokes SymbiYosys (`sby`) inside the `ts2v-gowin-oss` toolchain container. Exits 0 on
`PASS`, exits 1 on `FAIL` or missing file. Use `TS2V_CONTAINER_RUNTIME=docker` to switch
from Podman (the default).

The toolchain container includes SymbiYosys and `yosys-smtbmc` via the OSS CAD Suite.
Rebuild the image with `bun run toolchain:image:build` if it is out of date.

## Limitations

- Only `() => <expr>` arrow functions are accepted — no parameters, no multi-statement bodies.
- Temporal SVA operators (`##`, `|->`, sequences) are not parsed; use simple boolean expressions.
- The clock used for all `assert property` / `assume property` is the clock from the first
  `@Sequential` method in the module; modules with multiple clock domains use only one clock.
- `@Assert` and `@Assume` are class decorators — they apply to the module as a whole, not to
  individual methods.
- No `.sby` is generated when no assertions are present.

## Adding Formal Properties to nibble4

```typescript
@Assert(() => this.pc < 32, 'pc_in_range')
@Assert(() => this.state !== 0xFF, 'no_invalid_state')
@Module
class Nibble4Core extends HardwareModule { ... }
```

Compile the cpu directory and run verify:

```bash
bun run apps/cli/src/index.ts compile examples/cpu/nibble4 --out .artifacts/nibble4
bun run verify .artifacts/nibble4/nibble4.sby
```
