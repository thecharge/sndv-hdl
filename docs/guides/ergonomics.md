# Ergonomics API Guide

ts2v v2.0 adds a set of ergonomic helpers that make hardware code more
readable.  All helpers are no-ops at the TypeScript level; the compiler
translates them to the correct SystemVerilog constructs.

## SignalBus\<T>

Group related ports under a named bus type.  Currently a type alias - ports
are still declared individually but can be annotated for tooling readability.

```typescript
import type { SignalBus } from '@ts2v/runtime';

type UartBus = SignalBus<{ tx: Bit; rx: Bit }>;
```

## Reg\<T>

Documents that a variable is a clocked register.  The compiler emits an
`always_ff` assignment regardless of whether `@Sequential` or `@Hardware` is
used.

```typescript
private counter: Reg<Logic<24>> = 0;
```

## rising() and falling()

Detect a single-cycle rising or falling edge on a signal.  The compiler
generates a `prev_X` shadow register and the corresponding edge expression.

```typescript
import { rising, falling } from '@ts2v/runtime';

@Sequential('clk')
tick(): void {
    if (rising(this.btn)) {
        this.led = this.led ^ 0x3F;
    }
}
```

Emitted SystemVerilog:

```systemverilog
logic prev_btn;
always_ff @(posedge clk) begin
    prev_btn <= btn;
    if (btn && !prev_btn) begin
        led <= led ^ 6'h3f;
    end
end
```

Both `rising(this.X)` and `falling(this.X)` are supported.  The `prev_X`
register is added once per signal even if both edges are checked.

## @Hardware decorator

`@Hardware` is an alias for `@Sequential` that infers the clock signal from
the module's `@Input clk`.  Use it for simple single-clock modules to avoid
repeating the clock name.

```typescript
@Hardware('clk')
tick(): void {
    ...
}
```

This is syntactic sugar only - the compiler desugars it to the standard
`@Sequential` path.

## Migration note

All existing `@Sequential` / `@Combinational` code continues to work
unchanged.  The ergonomics API is additive and opt-in.
