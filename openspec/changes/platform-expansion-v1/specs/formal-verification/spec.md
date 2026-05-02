## ADDED Requirements

### Requirement: @Assert decorator emits SVA assertion
The compiler SHALL recognise `@Assert(expr)` applied to a method and emit a SystemVerilog `assert property` statement inside an `always_comb` block in the generated SV output.

#### Scenario: @Assert generates SVA assert property
- **WHEN** a module method is decorated with `@Assert(() => this.count < 256)`
- **THEN** the generated SV contains `assert property (@(posedge clk) count < 256);` or equivalent combinational assertion

#### Scenario: @Assert on non-boolean expression rejected
- **WHEN** a module method is decorated with `@Assert` with an expression that does not resolve to a boolean-compatible type
- **THEN** the compiler SHALL emit an error with source location and halt compilation

### Requirement: @Assume decorator emits SVA assumption
The compiler SHALL recognise `@Assume(expr)` applied to a method and emit a SystemVerilog `assume property` statement in the generated SV output.

#### Scenario: @Assume generates SVA assume property
- **WHEN** a module method is decorated with `@Assume(() => this.rst_n === 1)`
- **THEN** the generated SV contains `assume property` with the corresponding boolean expression

### Requirement: SymbiYosys configuration file auto-generated
When the compiled design contains any `@Assert` or `@Assume` decorators, the compiler SHALL auto-generate a `.sby` SymbiYosys configuration file in the output directory alongside the SV files.

#### Scenario: .sby file created when assertions present
- **WHEN** a design with at least one `@Assert` is compiled to `.artifacts/my-design/`
- **THEN** `.artifacts/my-design/my-design.sby` exists with a valid SymbiYosys `[options]`, `[engines]`, and `[files]` section targeting bounded model checking (bmc)

#### Scenario: No .sby file when no assertions
- **WHEN** a design with no `@Assert` or `@Assume` is compiled
- **THEN** no `.sby` file is produced

### Requirement: bun run verify script invokes SymbiYosys
A `bun run verify` script SHALL be added to the root `package.json`; it runs SymbiYosys on a specified `.sby` file inside the existing toolchain container and reports PASS or FAIL with the property name and cycle depth.

#### Scenario: verify script passes on a trivially-true property
- **WHEN** a design has `@Assert(() => 1 === 1)` and `bun run verify .artifacts/design/design.sby` is run
- **THEN** the script exits 0 and prints `PASS` for the assertion

#### Scenario: verify script fails on a violated property
- **WHEN** a design has `@Assert(() => this.counter < 4)` and the counter reaches 4 within the bound depth
- **THEN** the script exits non-zero and prints `FAIL` with the cycle at which the property was violated

### Requirement: TypeScript property specification API
The `@ts2v/runtime` package SHALL export `@Assert` and `@Assume` decorators typed to accept an arrow function returning `boolean` (or a `Logic` expression), enabling IDE autocompletion and type checking of property expressions.

#### Scenario: @Assert typed correctly in IDE
- **WHEN** a user writes `@Assert(() => this.count < 256)` in a `@Module` class
- **THEN** TypeScript type checking succeeds and no type error is raised

#### Scenario: @Assert with wrong type causes TypeScript error
- **WHEN** a user writes `@Assert(() => "string")` (non-boolean return)
- **THEN** TypeScript reports a type error before compilation
