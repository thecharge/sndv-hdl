# SystemVerilog Output Compliance

## IEEE 1800-2017 (SystemVerilog) Compliance

### Functional Compiler (function-based API)

**Generated and conformant:**
- ANSI-style port declarations (Section 23.2.2)
- `logic` data type for all ports and signals (Section 6.3.4): the IEEE 1800-2017 preferred type over `wire`
- Continuous assignment with `assign` (Section 10.3)
- Sized literals: `32'd42`, `32'hFF`, `4'b1010` (Section 5.7)
- `` `timescale `` directive (Section 22.7)
- `` `default_nettype none `` / `` `default_nettype wire `` guards (Section 22.8)
- Single-module-per-function mapping
- No inferred latches (complete if/else chains flattened to ternary)
- Arithmetic right shift `>>>` (Section 11.4.10)
- Logical NOT `!` (Section 11.3.3)

**Output validated with:**
- Balanced `module`/`endmodule` pairs
- All ports declared with explicit `logic` type
- All `assign` statements terminated with `;`
- No TypeScript artifacts in output
- No multiply-driven nets (linter check)

**Not generated (functional compiler, by design):**

| Feature              | IEEE Section | Notes               |
| -------------------- | ------------ | ------------------- |
| `always_ff`          | 9.2.2        | Class compiler only |
| `always_comb`        | 9.2.1        | Class compiler only |
| `typedef enum`       | 6.19         | Class compiler only |
| `typedef struct`     | 7.2          | Not planned         |
| `parameter`          | 6.20         | Not planned         |
| `generate`           | 27           | Not planned         |
| `assert`             | 16           | Class compiler only |
| Module instantiation | 23.3         | Class compiler only |

### Class Compiler (`@Module` decorator API)

The class compiler implements full IEEE 1800-2017-compliant sequential and combinational SystemVerilog:
- `always_ff @(posedge clk or negedge rst_n)` with non-blocking assignments `<=`
- `always_comb` with blocking assignments `=`
- `typedef enum logic [N:0]` for TypeScript enums
- `logic` for all signal types (never `wire`; IEEE 1800-2017 preferred)
- `input logic` for input ports (not `input wire logic`)
- Submodule instantiation with named port connections
- Concurrent `$assert` annotations
- `UintN` / `Logic<N>` for arbitrary-width ports (tested above 64 bits)
- Method-local `let`/`const` variables promoted to module-level `logic` registers when used across branches
- `` `timescale `` and `` `default_nettype none/wire `` guards

## Open-Source Synthesis Tool Compatibility

| Tool                                      | Supported                   |
| ----------------------------------------- | --------------------------- |
| Yosys + nextpnr-himbaechel (Gowin boards) | **Full**                    |
| Icarus Verilog (simulation)               | **Full**                    |
| Verilator (lint/simulation)               | **Full**                    |
| Yosys + nextpnr-xilinx (Xilinx 7-series)  | Experimental (not in scope) |

Closed-source tools (Vivado, Quartus, proprietary Gowin EDA pack) are **not in scope**.

## Supported Boards (Open-Source Toolchain Only)

| Board         | FPGA      | Synthesis           | PnR                  | Bitstream    | Flash            | Status                  |
| ------------- | --------- | ------------------- | -------------------- | ------------ | ---------------- | ----------------------- |
| Tang Nano 20K | GW2AR-18C | `synth_gowin`       | `nextpnr-himbaechel` | `gowin_pack` | `openFPGALoader` | **Production**          |
| Tang Nano 9K  | GW1NR-9C  | `synth_gowin`       | `nextpnr-himbaechel` | `gowin_pack` | `openFPGALoader` | **Supported**           |
| Arty A7       | XC7A35T   | Constraint-gen only | Not in scope         | N/A          | `openFPGALoader` | **Constraint-gen only** |
| DE10-Nano     | Cyclone V | No OSS path         | N/A                  | N/A          | N/A              | **Out of scope**        |

A board may only be added to `configs/workspace.config.json` and `packages/types/SupportedBoardId` when its complete OSS synthesis-to-flash path is verified end-to-end.

## TypeScript Subset Compliance

### Functional Compiler

**Supported:** `function`, `const`, `let`, `return`, `if`/`else`, `number`, `boolean`, `number[]`, `boolean[]`, all arithmetic/bitwise/comparison/shift operators (including `>>>` arithmetic right shift and `!` logical NOT), hex/binary/decimal literals, comments.

**Explicitly rejected with `[TS2V-2000]`:**

| Construct     | Error                                   |
| ------------- | --------------------------------------- |
| `class`       | Expected function but found "class"     |
| `interface`   | Expected function but found "interface" |
| `=>` (arrow)  | Expected function but found "const"     |
| `async`       | Expected function but found "async"     |
| `for`         | Expected function but found "for"       |
| `while`       | Expected function but found "while"     |
| `string` type | Expected type but found "string"        |

### Class Compiler

Supports the full `@Module` / `@Sequential` / `@Combinational` / `@Input` / `@Output` / `@Submodule` / `@Assert` decorator pattern.
See `docs/specification.md` for the complete class-compiler language reference.
