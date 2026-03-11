# Verilog Output Compliance

## IEEE 1800-2017 (SystemVerilog) Compliance

### What the generated output follows

- ANSI-style port declarations (IEEE 1800-2017 Section 23.2.2)
- `wire` net type for all combinational signals
- Continuous assignment with `assign` (Section 10.3)
- Sized literals with base specifiers: `32'd42`, `32'hFF`, `4'b1010` (Section 5.7)
- `timescale directive (Section 22.7)
- `default_nettype none` / `wire` guards (Section 22.8)
- Single-module-per-function mapping
- No inferred latches (all if/else chains are complete with else)

### What is NOT generated (by design, Milestone 1)

| Feature | IEEE Section | Status | Milestone |
|---------|-------------|--------|-----------|
| `always_ff` | 9.2.2 | Not generated | 2 |
| `always_comb` | 9.2.1 | Not generated | 2 |
| `typedef enum` | 6.19 | Not generated | 2 |
| `typedef struct` | 7.2 | Not generated | 3 |
| `parameter` | 6.20 | Not generated | 3 |
| `generate` | 27 | Not generated | 3 |
| `assert` | 16 | Not generated | 4 |
| Module instantiation | 23.3 | Not generated | 2 |

### Synthesis tool compatibility

The generated `.v` files have been structurally validated for:
- No multiply-driven nets (linter check)
- Balanced module/endmodule pairs
- All ports have explicit `wire` net type
- No TypeScript artifacts leak into output
- All `assign` statements have semicolons
- Balanced parentheses throughout

Compatible toolchains (combinational modules only):
- Gowin EDA (Tang Nano 9K, Tang Primer)
- Xilinx Vivado (Arty A7, Zynq)
- Intel Quartus (DE10 Nano, MAX10)
- Yosys + nextpnr (iCE40, ECP5)
- Verilator (simulation)
- Icarus Verilog (simulation)

### Limitations for FPGA deployment

The generated modules are pure combinational logic. To deploy on
actual FPGA hardware, you need a sequential wrapper that provides:

1. Clock signal connection
2. Reset logic
3. State registers (`reg` declarations)
4. `always @(posedge clk)` blocks

See `boards/tang_nano_9k/blinker_top.v` for a complete example
of wrapping generated combinational modules with sequential logic.

## TypeScript subset compliance

### Supported (Milestone 1)

The transpiler accepts a strict subset of TypeScript. Every construct
outside this subset is rejected with a `[TS2V-2000]` parse error
identifying the unsupported token with line and column.

Supported: `function`, `const`, `let`, `return`, `if`/`else`,
`number`, `boolean`, `number[]`, `boolean[]`, all arithmetic/bitwise/
comparison/shift operators, hex/binary/decimal literals, comments.

### Explicitly rejected with clear errors

| Construct | Error code | Error message |
|-----------|-----------|---------------|
| `class` | TS2V-2000 | Expected function but found "class" |
| `interface` | TS2V-2000 | Expected function but found "interface" |
| `=>` (arrow) | TS2V-2000 | Expected function but found "const" |
| `async` | TS2V-2000 | Expected function but found "async" |
| `for` | TS2V-2000 | Expected function but found "for" |
| `while` | TS2V-2000 | Expected function but found "while" |
| `string` type | TS2V-2000 | Expected type but found "string" |
