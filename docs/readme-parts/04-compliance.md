
## Spec Compliance

### Translation Rules (from spec)

| TypeScript | SystemVerilog | Spec Section |
|---|---|---|
| `@Module` class | `module` | §3.1 |
| `@Sequential(clk)` | `always_ff @(posedge clk or negedge rst_n)` | §4.2, §52 |
| `@Combinational` | `always_comb` | §4.1 |
| `this.x = y` in Sequential | `x <= y` (non-blocking) | §4.3 |
| `this.x = y` in Combinational | `x = y` (blocking) | §4.3 |
| `enum State { ... }` | `typedef enum logic [W-1:0] { ... }` | §9.1 |
| `switch/case` in Sequential | `case/endcase` (FSM pattern) | §10.2 |
| `@Input` property | `input wire logic` | §3.2 |
| `@Output` property | `output logic` | §3.2 |
| `private` property (initialized) | Reset value in `if (!rst_n)` block | §52.1 |
| `board.json` | `.cst` / `.xdc` / `.qsf` / `.lpf` | §62 |

### Reset Handling (Spec §52)

The compiler implements the spec's **"Property Initialization as Reset"** paradigm:

- Property initializers (`= 0`) become reset values
- Default: async reset, active-low (`negedge rst_n`)
- Configurable via `@ModuleConfig({ resetPolarity: "active_high", resetType: "synchronous" })`
- Auto-injects `rst_n` port when sequential logic is present

### IEEE 1800-2017 Compliance

Every generated file includes:
- `\`timescale 1ns / 1ps` (Clause 22)
- `\`default_nettype none` / `wire` (safety, Clause 22)
- `always_comb` / `always_ff` (no generic `always`, Clause 9)
- Proper port declarations with `wire` qualifiers (Clause 23)
