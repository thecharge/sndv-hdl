# Constraints — hardware-decorators-and-runtime

---

## Import Alias Policy

All hardware source MUST use `'@ts2v/runtime'` as the import source. The alias `'ts2sv'`
is legacy and forbidden. Any proposal that introduces a new import alias must:
1. Update the package exports
2. Update CLAUDE.md forbidden patterns table
3. Update all existing examples via a migration task

---

## Decorator Implementation Rules

Decorators in this package are TypeScript-side syntax markers only. They MUST:
- Be no-ops at runtime (no side effects, no prototype mutation)
- Not throw or log anything
- Not import any external runtime libraries
- Remain compatible with TypeScript's experimental decorator syntax
  (`experimentalDecorators: true` in tsconfig)

If a new decorator is proposed (e.g., `@InOut`, `@AsyncReg`), it must:
- First be implemented as a no-op in this package
- Then have corresponding Compiler Agent support for parsing and emission
- Both must land in the same change

---

## Known Type Limitation

`LogicArray<W,S>` indexed sequential access (e.g. `this.pixels[this.idx] = value`) compiles
at the TypeScript type level but the class compiler does NOT support emitting it as
`always_ff` logic. Until `add-logicarray-indexed-access` is implemented, hardware source
using this pattern must use the explicit if/else chain workaround.

No proposal may claim `LogicArray` indexed sequential access "works" without first
implementing and testing the Compiler Agent support.

---

## Versioning

Changes to decorator signatures (e.g., adding a new argument to `@Sequential`) require:
1. A backward-compatible implementation (old call sites must not break)
2. Coordination with the Compiler Agent to handle both old and new forms
3. Update of `docs/specification.md` and this spec
