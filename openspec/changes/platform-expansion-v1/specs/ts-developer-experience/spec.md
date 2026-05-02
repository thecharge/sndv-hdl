## MODIFIED Requirements

### Requirement: runtime package exports ergonomics helpers
The `@ts2v/runtime` package SHALL export `SignalBus<T>`, `Reg<T>`, `Edge`, `rising`, `falling`, and `@Hardware` in addition to all existing exports. Existing exports MUST remain unchanged.

#### Scenario: Ergonomics helpers importable from runtime
- **WHEN** a TypeScript hardware module imports `{ Reg, rising, @Hardware }` from `@ts2v/runtime`
- **THEN** TypeScript compilation succeeds and the ts2v compiler processes the decorators correctly

#### Scenario: Existing decorator imports unaffected
- **WHEN** an existing module imports `@Module`, `@Sequential`, `@Combinational` from `@ts2v/runtime`
- **THEN** behavior is identical to before this change

### Requirement: @Hardware decorator desugars to Sequential or Combinational
The compiler SHALL treat `@Hardware` as a compile-time shorthand: methods that reference a clock signal desugar to `@Sequential`; methods that do not desugar to `@Combinational`.

#### Scenario: @Hardware without clock becomes always_comb
- **WHEN** a method decorated with `@Hardware` contains only combinational logic (no clock reference)
- **THEN** the generated SV uses `always_comb`

#### Scenario: @Hardware with clock becomes always_ff
- **WHEN** a method decorated with `@Hardware` references a clock via `rising(this.clk)` or a declared clock port
- **THEN** the generated SV uses `always_ff` with the correct sensitivity list
