# Scenarios — Class Compiler

Acceptance scenarios for the class-based (decorator) compilation path.
All scenarios use GIVEN-WHEN-THEN format with measurable acceptance criteria.

---

## SCENARIO: Minimal blinker module compilation

GIVEN a TypeScript class:
```typescript
@Module
class Blinker extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  rst_n: Bit = 0;
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
```

WHEN compiled with `--board boards/tang_nano_20k.board.json`

THEN the output SHALL contain an `always_ff @(posedge clk or negedge rst_n)` block
AND SHALL contain non-blocking assignments (`<=`) inside the always_ff
AND SHALL contain an async reset block: `if (!rst_n) begin led <= 6'h3F; ... end`
AND SHALL declare `input logic clk`, `input logic rst_n`, `output logic [5:0] led`
AND SHALL declare `logic [23:0] counter`

ACCEPTANCE:
- `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/blinker/blinker.ts --board boards/tang_nano_20k.board.json --out .artifacts/blinker` exits 0
- Yosys synthesis (`bun run test:uvm`) produces a placed netlist without errors

---

## SCENARIO: @ModuleConfig no-reset disables reset injection

GIVEN a module with `@ModuleConfig('resetSignal: "no_rst"')`:
```typescript
@Module
@ModuleConfig('resetSignal: "no_rst"')
class AuroraWave extends HardwareModule {
    @Input clk: Bit = 0;
    @Output led: Logic<6> = 0x3F;
    @Sequential('clk')
    tick(): void { ... }
}
```

WHEN compiled

THEN the `always_ff` block SHALL NOT contain a reset branch
AND the `always_ff` sensitivity list SHALL be `@(posedge clk)` (no `negedge rst_n`)
AND no `rst_n` port SHALL appear in the module declaration

ACCEPTANCE: Generated SV has no `rst_n` signal.

---

## SCENARIO: Enum generates typedef enum

GIVEN a top-level TypeScript enum:
```typescript
enum FsmState { IDLE = 0, RUNNING = 1, DONE = 2 }
```

WHEN compiled

THEN the output SHALL contain:
```systemverilog
typedef enum logic [1:0] { IDLE = 2'd0, RUNNING = 2'd1, DONE = 2'd2 } FsmState;
```

AND the bit width SHALL be automatically computed from the number of members
AND the enum SHALL be declared at file scope (outside any module block)

ACCEPTANCE: `bun run test:root` regression tests cover enum emission.

---

## SCENARIO: Enum name collision detection

GIVEN two TypeScript enums in a multi-file design that share member names:
```typescript
enum RxSt { IDLE = 0, DATA = 1 }
enum TxSt { IDLE = 0, DATA = 1 }   // IDLE already defined
```

WHEN compiled and passed to Yosys

THEN Yosys SHALL emit an error: `enum item IDLE already exists`

AND the CORRECT approach SHALL be:
```typescript
enum RxSt { RX_IDLE = 0, RX_DATA = 1 }
enum TxSt { TX_IDLE = 0, TX_DATA = 1 }
```

ACCEPTANCE: Documentation in CLAUDE.md explains the required naming convention.

---

## SCENARIO: Method-local variable promotion

GIVEN a `@Sequential` method with a `let` variable assigned in both branches:
```typescript
@Sequential('clk')
tick(): void {
    let bitValue: Logic<1> = 0;
    if (this.state === 1) { bitValue = 1; }
    else { bitValue = 0; }
    this.ws2812 = bitValue;
}
```

WHEN compiled

THEN the output SHALL declare `logic bitValue;` at module level
AND the `always_ff` reset block SHALL reset `bitValue <= 1'b0`
AND the always_ff body SHALL assign `bitValue` as a non-blocking assignment

ACCEPTANCE: Generated SV passes `iverilog` without undeclared identifier errors.

---

## SCENARIO: Private helper method inlining

GIVEN a module with a private helper called from `@Sequential`:
```typescript
private getColor(h: Logic<8>): Logic<24> {
    if (h < 85) { return h * 3; }
    return 0;
}
@Sequential('clk')
tick(): void {
    this.led = this.getColor(this.hue);
}
```

WHEN compiled

THEN the `always_ff` block SHALL NOT contain a function call `getColor(...)`
AND SHALL instead contain the inline body of `getColor` with `this.` prefix stripped
AND no SV function declarations SHALL appear in the output

ACCEPTANCE: Yosys synthesizes the output without `getColor` function references.

---

## SCENARIO: Submodule instantiation and auto-wiring

GIVEN a parent module:
```typescript
@Module
class Top extends HardwareModule {
    @Input  clk: Bit = 0;
    private data: Logic<8> = 0;
    @Submodule proc = new Processor({ clk: this.clk, data: this.data });
}
```

WHEN compiled

THEN the output SHALL contain a named-port instantiation:
```systemverilog
Processor proc_inst (.clk(clk), .data(data));
```

AND the port connections SHALL be by name (not positional)

ACCEPTANCE: Yosys can elaborate the instantiation without port mismatch errors.

---

## SCENARIO: switch/case FSM emission

GIVEN a `@Sequential` method with `switch/case`:
```typescript
switch (this.state) {
    case FsmState.IDLE: this.out = 0; break;
    case FsmState.RUNNING: this.out = 1; break;
    default: break;
}
```

WHEN compiled

THEN the output SHALL contain `case (state)` ... `endcase` (IEEE 1800-2017 `case` construct)
AND `break` SHALL NOT appear in the SV output (it is removed; SV `case` does not need it)

ACCEPTANCE: Yosys synthesizes the `case` statement without errors.

---

## SCENARIO: Directory compilation strips imports

GIVEN a directory with two `.ts` files, each containing `import { ... } from '@ts2v/runtime'`

WHEN compiled as a directory

THEN the compiler SHALL strip all import/export lines before concatenation
AND the resulting `.sv` SHALL contain both modules
AND SHALL NOT contain any `import` or `export` TypeScript keywords

ACCEPTANCE: `bun run compile:example` on a multi-file example (e.g. ws2812_demo) succeeds.
