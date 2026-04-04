# Requirements — hardware-decorators-and-runtime

Requirements for the `@ts2v/runtime` package. Keyed REQ-DECR-NNN.

---

## Package Exports

REQ-DECR-001: The package SHALL export all hardware decorators: `Module`, `ModuleConfig`,
`Input`, `Output`, `Sequential`, `Combinational`, `Submodule`, `Assert`, `Param`.

REQ-DECR-002: The package SHALL export all hardware types: `Logic<N>`, `Bit`, `UintN`,
`UIntN`, `LogicArray<W,S>`, `HardwareModule`.

REQ-DECR-003: All hardware source files SHALL import from `'@ts2v/runtime'` (not from
the legacy `'ts2sv'` alias or any direct relative path into the package).

---

## Decorator Semantics at Runtime

REQ-DECR-010: All decorators SHALL be no-ops at TypeScript runtime. They MUST NOT modify
class behavior, add prototype properties, or throw errors during module loading.

REQ-DECR-011: `@Module` SHALL be a class decorator that returns the target class unchanged.

REQ-DECR-012: `@Input` and `@Output` SHALL be property decorators that do nothing at runtime.

REQ-DECR-013: `@Sequential(clockName)` SHALL return a method descriptor unchanged at runtime.

REQ-DECR-014: `@Combinational` SHALL return a method descriptor unchanged at runtime.

REQ-DECR-015: `@Submodule` SHALL be a property decorator that does nothing at runtime.

REQ-DECR-016: `@Assert(condition, message?)` SHALL be a function that does nothing at runtime.

REQ-DECR-017: `@ModuleConfig(configString)` SHALL return a class decorator that does nothing
at runtime. The config string is parsed by the compiler, not evaluated as code.

REQ-DECR-018: `@Param` SHALL be a property decorator that does nothing at runtime. It marks a property as a synthesisable SV `parameter` — the decorated property SHALL carry a numeric literal default value that the compiler emits as the parameter default. The decorated property SHALL NOT appear as a port or internal signal.

---

## Type Safety

REQ-DECR-020: `Logic<N>` SHALL be a TypeScript type that is compatible with `number` at the
type level, enabling TypeScript tooling to accept arithmetic expressions without errors.

REQ-DECR-021: `Bit` SHALL be a type alias equivalent to `Logic<1>`.

REQ-DECR-022: `UintN` and `UIntN` SHALL be type aliases for Logic<N> with the same
TypeScript-level semantics. Naming is case-insensitive at the type level.

REQ-DECR-023: `LogicArray<W, S>` SHALL be a type that represents a register file (width W,
size S). TypeScript type checking SHALL accept indexed access syntax. The compiler is
responsible for reporting unsupported patterns at compile time.

REQ-DECR-024: `HardwareModule` SHALL be a base class that all `@Module` classes extend.
It SHALL NOT introduce any non-trivial runtime behavior.

---

## Package Integrity

REQ-DECR-030: The package MUST typecheck cleanly under `bun run quality`.
REQ-DECR-031: The package MUST NOT introduce runtime dependencies beyond TypeScript itself.
REQ-DECR-032: Changing decorator signatures in this package requires coordinated updates
to the Compiler Agent's parser so both remain in sync.
