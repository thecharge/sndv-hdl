## Why

SystemVerilog modules accept compile-time parameters (`parameter WIDTH = 8;`) that allow a single generic module definition to be instantiated at multiple widths or configurations. The ts2v class compiler currently emits only `localparam` (internal constants), with no way to declare or override module parameters from a parent design. This forces authors to write separate nearly-identical module classes for every configuration variant, blocking reuse of generic building blocks like FIFOs, shift registers, and bus adapters.

## What Changes

- A new `@Param` decorator (or a `ModuleConfig` extension) allows a class property to be marked as a module-level SV `parameter` rather than a `localparam`.
- `ClassModuleAST` and `ModuleSignature` are extended to carry a `parameters` array.
- `class-module-parser.ts` identifies `@Param`-decorated top-level properties and records them in the AST.
- `class-module-emitter.ts` emits parameter declarations in the module header (`#(parameter logic [W-1:0] NAME = DEFAULT)`) and emits `#(.NAME(VALUE))` parameter overrides when instantiating a submodule with explicit param bindings.
- A new runtime export `Param` is added to `@ts2v/runtime`.
- An end-to-end hardware example (`examples/hardware/tang_nano_20k/generic_counter/`) demonstrates a parameterised counter module instantiated at two different widths.

**No breaking changes.** Modules without `@Param` decorators compile identically to today.

## Capabilities

### New Capabilities

- `parameterised-modules`: Declare, emit, and override compile-time module parameters using a `@Param` decorator, producing IEEE 1800-2017 compliant `parameter` declarations in SystemVerilog.

### Modified Capabilities

- `ts-to-sv-compiler-core`: Class compiler parser and emitter handle the `@Param` decorator and parameter override syntax in submodule instantiation.
- `hardware-decorators-and-runtime`: New `Param` decorator added to `@ts2v/runtime` exports; JSDoc documents parameter declaration semantics.

## Impact

- **packages/runtime/src/decorators.ts** - add `Param` decorator export.
- **packages/runtime/src/index.ts** - re-export `Param`.
- **packages/core/src/compiler/class-compiler/class-module-ast.ts** - extend `ClassModuleAST` and `ModuleSignature` with `parameters` array.
- **packages/core/src/compiler/class-compiler/class-module-parser.ts** - parse `@Param` decorated properties into parameter AST nodes.
- **packages/core/src/compiler/class-compiler/class-module-emitter.ts** - emit parameter list in module header; emit `#(...)` overrides in `emitSubmoduleInst`.
- **examples/hardware/tang_nano_20k/generic_counter/** - new example with `@Param` usage.
- **openspec/specs/ts-to-sv-compiler-core/** and **openspec/specs/hardware-decorators-and-runtime/** - requirement updates.
- No CLI, toolchain, board config, or testbench changes required.

## Non-goals

- No support for string or real-valued parameters (only `logic`-typed integer parameters).
- No support for parameterised port widths driven by parameters (port widths remain fixed at parse time in this iteration).
- No proprietary EDA tool changes.
- No functional (non-class) compiler changes.

## OSS Toolchain Impact

None. `parameter` declarations are standard IEEE 1800-2017 and are fully supported by Yosys and nextpnr.

## Delivery Gates

- `bun run quality` passes.
- `bun run compile:example` generates correct SV with parameter declarations for the `generic_counter` example.
- `bun run test:uvm` passes.
- Compiler Agent owns parser and emitter changes; Build Agent owns runtime decorator additions.
