# Scenarios — Decorator Usage

Acceptance scenarios for the `@ts2v/runtime` decorator and type API.

---

## SCENARIO: @Module class compiles without runtime error

GIVEN a TypeScript file importing and using `@Module`:
```typescript
import { HardwareModule, Module, Input, Output, Sequential } from '@ts2v/runtime';
import type { Bit, Logic } from '@ts2v/runtime';

@Module
class Led extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output led: Logic<1> = 0;
    @Sequential('clk')
    tick(): void { this.led = 1; }
}
```

WHEN TypeScript typechecks this file

THEN no TypeScript errors SHALL appear
AND the file SHALL load without runtime exceptions (decorators are no-ops)

ACCEPTANCE: `bun run quality` passes; no typecheck errors on any hardware example.

---

## SCENARIO: @ModuleConfig disables reset in generated SV

GIVEN a module using `@ModuleConfig('resetSignal: "no_rst"')`

WHEN compiled by the class compiler

THEN the generated SV SHALL omit the reset branch in `always_ff`
AND the config string SHALL NOT appear in the SV output as a string literal

ACCEPTANCE: Generated .sv for aurora_wave contains no `rst_n` signal.

---

## SCENARIO: Logic<N> accepts arithmetic without TypeScript errors

GIVEN a hardware module using `Logic<24>` fields:
```typescript
private counter: Logic<24> = 0;
// ...
this.counter = this.counter + 1;
```

WHEN TypeScript typechecks this file

THEN no type mismatch errors SHALL appear for the arithmetic expression

ACCEPTANCE: All existing hardware examples typecheck with `bun run quality`.

---

## SCENARIO: UintN and UIntN are interchangeable

GIVEN a hardware module using both `Uint128` and `UInt256`

WHEN TypeScript typechecks this file

THEN both forms SHALL typecheck identically (case-insensitive alias)

ACCEPTANCE: Typecheck passes; no compiler errors.

---

## SCENARIO: HardwareModule base class provides no side effects

GIVEN a class extending `HardwareModule`:
```typescript
class MyModule extends HardwareModule { ... }
const m = new MyModule();
```

WHEN instantiated at runtime

THEN no console output, no prototype modifications, no global state changes SHALL occur

ACCEPTANCE: Unit tests for the runtime package verify constructor is a no-op.

---

## SCENARIO: Old 'ts2sv' import alias is rejected by quality gate

GIVEN a TypeScript file using `import { Module } from 'ts2sv'`

WHEN `bun run quality` runs the linter

THEN the linter SHALL flag this import as an error (forbidden alias)

ACCEPTANCE: Biome or equivalent lint rule enforces `'@ts2v/runtime'` only.
