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
