## Context

The class compiler's `ClassModuleAST` and `ModuleSignature` types have no concept of SV module parameters. The compiler already has mechanisms to handle submodule signatures (`registerModuleSignature`) and instantiate submodules by matching port names. SV `parameter` declarations fit naturally into this same signature model.

The `@Param` decorator pattern mirrors the existing `@Input`/`@Output` pattern: a property decorator marks a field for special compiler handling. At parse time the compiler checks for this decorator and records the field as a parameter instead of a port or internal.

## Goals / Non-Goals

**Goals:**
- New `@Param` decorator recognised by the class compiler.
- `ClassModuleAST` and `ModuleSignature` carry a `parameters` array.
- Module emitter emits `#(parameter ...)` in header and `#(...)` overrides on instantiation.
- `generic_counter` example demonstrates feature.

**Non-Goals:**
- Parameters driving port widths (port widths remain fixed in this iteration).
- String or real-valued parameters.
- Functional (non-class) compiler.

## Decisions

**Decision: `@Param` as a standalone property decorator**

Using a dedicated decorator keeps the semantic clear and matches how `@Input`/`@Output` work. Alternative (annotating top-level consts with a `param: true` option in `@ModuleConfig`) was considered but rejected — it does not map to the property-level ownership model and would require a separate AST post-processing pass.

**Decision: Parameters emitted before port list in module header**

IEEE 1800-2017 §23.2.1 places the parameter port list (`#(...)`) before the port list. The emitter already writes the port list in `emitModule`; parameters will be emitted immediately before it.

**Decision: Parameter override syntax uses named binding `#(.NAME(VALUE))`**

This is the most explicit and error-safe SV instantiation style and matches the style used for port bindings.

## Risks / Trade-offs

- **Risk: Parameters with expressions as defaults.** For this iteration only numeric literal defaults are supported. Non-literal defaults will cause a compile error.
  - Mitigation: documented constraint; expand in a follow-up.
- **Risk: Parameter name collisions with ports/internals.** Parameter names share the same SV scope as ports; a name collision would produce invalid SV.
  - Mitigation: parser checks for duplicates and emits a `CompilerError`.
