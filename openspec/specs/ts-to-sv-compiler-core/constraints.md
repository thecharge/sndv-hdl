# Constraints — ts-to-sv-compiler-core

Non-functional rules, TypeScript subset restrictions, and limitations binding on
the Compiler Agent. These are not aspirational — they are hard boundaries.

---

## TypeScript Subset (Class Compiler) — What IS Supported

The following constructs compile correctly and must remain supported in all future versions:

**Statements and control flow:**
- `if / else if / else` with and without braces
- `switch / case / default / break`
- Early `return` (converted to if/else chain)
- `let` / `const` locals inside `@Sequential` / `@Combinational` methods

**Operators (inside method bodies):**
- Arithmetic: `+`, `-`, `*`
- Bitwise: `&`, `|`, `^`, `~`
- Shift: `<<`, `>>` (logical), `>>>` (arithmetic)
- Comparison: `===`, `!==`, `<`, `>`, `<=`, `>=`

**Declarations:**
- `enum` at top level -> `typedef enum logic [N:0]`
- `const` at file level -> inlined as SV literals
- `@Module` class with `@Input`, `@Output`, private fields
- Private helper methods (inlined at call site)

**Types:**
- `Logic<N>`, `Bit`, `UintN`/`UIntN`, `logic` (bare)
- `LogicArray<W,S>` (declared only; indexed sequential access not supported)

---

## TypeScript Subset — What Is EXPLICITLY FORBIDDEN

These patterns must be rejected or produce a documented workaround.
Never accept these silently or partially compile them:

| Forbidden | Reason | Workaround |
|---|---|---|
| Ternary `?:` | Compiler does not handle it | Use `if/else` |
| `let`/`var` at module level | Must be `const` | Use `const` |
| Magic numbers in logic | Readability and maintainability | Named `const` at top of file |
| Cross-module free function calls from `@Sequential` | Compiler inlines only same-class methods | Helper method or `@Submodule` |
| `||` and `&&` in conditions (uncertain) | May fail in some contexts | Use nested `if` or separate checks |
| Template literals, strings in hardware | Not supported | Not applicable to hardware |
| Class generics at runtime | Not supported | Shared `_constants.ts` |
| `LogicArray[idx]` assignment in `@Sequential` | Known compiler limitation | Explicit pixel0..pixelN + if/else |
| Enum members sharing names across enums | Compiler emits all enums at file scope | Prefix member names by enum (e.g. `RX_IDLE`) |

---

## SystemVerilog Output Constraints

- MUST use `logic` for all signals and ports (never `wire`)
- MUST use `input logic` for input ports (never `input wire logic`)
- MUST use non-blocking assignments (`<=`) in `always_ff`
- MUST use blocking assignments (`=`) in `always_comb`
- MUST use `typedef enum logic [N:0]` for TypeScript enums
- MUST include `timescale 1ns / 1ps` directive
- MUST include `` `default_nettype none `` / `` `default_nettype wire `` guards
- MUST produce balanced `module`/`endmodule` pairs
- MUST NOT produce multiply-driven nets
- MUST produce valid input to Yosys `synth_gowin` without manual edits

---

## IEEE 1800-2017 Compliance Map

| Generated construct | IEEE 1800-2017 section |
|---|---|
| ANSI-style port declarations | §23.2.2 |
| `logic` data type | §6.3.4 |
| `assign` continuous assignment | §10.3 |
| Sized literals (32'd42, 4'b1010) | §5.7 |
| `` `timescale `` | §22.7 |
| `` `default_nettype `` | §22.8 |
| `always_ff` | §9.2.2 |
| `always_comb` | §9.2.1 |
| `typedef enum` | §6.19 |
| Non-blocking assignment `<=` | §10.4.2 |
| Blocking assignment `=` | §10.4.1 |
| Arithmetic right shift `>>>` | §11.4.10 |
| Logical NOT `!` | §11.3.3 |
| Concurrent assertion | §16 |

---

## Performance and Scalability

- The compiler MUST NOT impose a maximum bit width or array size limit beyond SystemVerilog
  language limits.
- The compiler MUST complete compilation of any existing hardware example in under 10 seconds
  on the development workstation.

---

## Quality Gate

- `bun run quality` MUST pass after every change to `packages/core/`.
- `bun run test:root` MUST pass; it is the primary regression suite for the class compiler.
- `bun run compile:example` MUST succeed after `bun run build`.
- The compiler MUST be built (`bun run build`) before compiled examples reflect any change
  to source files in `packages/core/`.
