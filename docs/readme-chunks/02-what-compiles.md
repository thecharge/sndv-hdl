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
