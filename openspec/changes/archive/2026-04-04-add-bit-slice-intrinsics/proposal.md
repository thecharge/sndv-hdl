## Why

SystemVerilog's part-select syntax (`signal[msb:lsb]`) is a fundamental operation in hardware design used for extracting sub-fields from a wide bus, inserting bits into a register, and constructing packed structures. The ts2v class compiler currently only supports single-index array element access (`signal[i]`). There is no way to express a range access in TypeScript source, forcing authors to use full-width signals and mask/shift operations — verbose, error-prone, and obscuring intent.

## What Changes

- A static helper `Bits.slice(signal, msb, lsb)` (and `Bits.bit(signal, i)`) is added to the `@ts2v/runtime` package. The compiler recognises calls to `Bits.slice(...)` and `Bits.bit(...)` as special intrinsic expression nodes.
- A new `SliceAccess` AST node is added to the expression AST.
- The expression parser recognises `Bits.slice(expr, msb, lsb)` and `Bits.bit(expr, i)` and produces `SliceAccess` nodes.
- The typechecker types a `SliceAccess` with `bit_width = msb - lsb + 1` when both bounds are numeric literals, or as a conservative `logic` when they are not.
- The expression emitter renders `SliceAccess` as `name[msb:lsb]` in SystemVerilog.
- An end-to-end example (`examples/hardware/tang_nano_20k/bus_splitter/`) demonstrates bit-slice usage in combinational and sequential logic.

**No breaking changes.**

## Capabilities

### New Capabilities

- `bit-slice-intrinsics`: Compile-time recognition of `Bits.slice(signal, msb, lsb)` and `Bits.bit(signal, i)` helper calls, translating them to IEEE 1800-2017 part-select syntax (`signal[msb:lsb]`).

### Modified Capabilities

- `ts-to-sv-compiler-core`: Expression AST gains `SliceAccess` node; parser, typechecker, and emitter gain corresponding handling.
- `hardware-decorators-and-runtime`: `Bits` namespace helper exported from `@ts2v/runtime`.

## Impact

- **packages/runtime/src/types.ts** - add `Bits` namespace with `slice` and `bit` static helpers (runtime no-ops, compiler intrinsics).
- **packages/runtime/src/index.ts** - re-export `Bits`.
- **packages/core/src/compiler/parser/ast.ts** - add `SliceAccess` expression node.
- **packages/core/src/compiler/class-compiler/class-stmt-parser.ts** or expression parser - recognise `Bits.slice(...)` / `Bits.bit(...)` call and produce `SliceAccess` node.
- **packages/core/src/compiler/typechecker/expression-checker.ts** - type `SliceAccess` to a `logic` of appropriate width.
- **packages/core/src/compiler/codegen/expression-emitter.ts** - render `SliceAccess` as `name[msb:lsb]`.
- **examples/hardware/tang_nano_20k/bus_splitter/** - new example.
- No CLI, board config, or toolchain changes required.

## Non-goals

- No part-select assignment (left-hand side `signal[msb:lsb] = value`); read-only slices only in this iteration.
- No native bracket `signal[msb:lsb]` syntax in TypeScript source (TypeScript does not allow colon inside index expressions; the `Bits.slice()` helper is the correct ergonomic surface).
- No proprietary EDA tools.

## OSS Toolchain Impact

None. Part-select `signal[msb:lsb]` is standard IEEE 1800-2017 and fully supported by Yosys and nextpnr.

## Delivery Gates

- `bun run quality` passes.
- `bun run compile:example` generates correct SV with `[msb:lsb]` for the `bus_splitter` example.
- `bun run test:uvm` passes.
- Compiler Agent owns AST, parser, typechecker, and emitter changes; Build Agent owns runtime helper additions.
