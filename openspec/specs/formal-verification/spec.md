# formal-verification Specification

## Purpose
TBD - created by archiving change platform-expansion-v1. Update Purpose after archive.
## Requirements
### Requirement: @Assert class decorator emits SVA assertion
The compiler SHALL recognise `@Assert(() => condition)` applied as a class-level decorator on a `@Module` class and emit a SystemVerilog `assert property` statement in the generated SV output, clocked on the module's sequential clock.

#### Scenario: @Assert generates SVA assert property
- **WHEN** a module class is decorated with `@Assert(() => this.counter <= 15, 'counter_in_range')`
- **THEN** the generated SV contains `assert property (@(posedge clk) counter<=15)` with an `else $error("counter_in_range")` clause

#### Scenario: @Assert without label generates unlabelled property
- **WHEN** a module class is decorated with `@Assert(() => this.x < 8)`
- **THEN** the generated SV contains `assert_0: assert property (@(posedge clk) x<8);`

### Requirement: @Assume class decorator emits SVA assumption
The compiler SHALL recognise `@Assume(() => condition)` applied as a class-level decorator and emit a SystemVerilog `assume property` statement in the generated SV output.

#### Scenario: @Assume generates SVA assume property
- **WHEN** a module class is decorated with `@Assume(() => this.enable === 0)`
- **THEN** the generated SV contains `assume_N: assume property (@(posedge clk) enable==0);`

### Requirement: Multiple @Assert / @Assume per module supported
A module SHALL accept multiple `@Assert` and `@Assume` decorators; each is assigned a unique auto-incrementing label (`assert_N` or `assume_N`).

#### Scenario: Two assertions get distinct labels
- **WHEN** a module has both `@Assert(() => this.x < 8)` and `@Assume(() => this.clk === 0 || this.clk === 1)`
- **THEN** the generated SV contains `assert_0:` and `assume_1:` as distinct named properties

### Requirement: SymbiYosys configuration file auto-generated
When the compiled design contains any `@Assert` or `@Assume` decorators, the compiler SHALL auto-generate a `.sby` SymbiYosys configuration file in the output directory alongside the SV file, using BMC mode at depth 20.

#### Scenario: .sby file created when assertions present
- **WHEN** a design with at least one `@Assert` is compiled to `.artifacts/my-design/`
- **THEN** `.artifacts/my-design/my-design.sby` exists with `[options]` (mode bmc, depth 20), `[engines]` (smtbmc), `[script]` (read -formal + prep -top), and `[files]` sections

#### Scenario: No .sby file when no assertions
- **WHEN** a design with no `@Assert` or `@Assume` is compiled
- **THEN** no `.sby` file is produced and no `formal` artifact is logged

### Requirement: bun run verify script invokes SymbiYosys
A `bun run verify <file.sby>` script SHALL be added to the root `package.json`; it runs SymbiYosys inside the existing toolchain container and prints `PASS` or `FAIL`.

#### Scenario: verify script exits 0 on passing properties
- **WHEN** `bun run verify .artifacts/design/design.sby` is run on a design whose assertions hold within depth 20
- **THEN** the script exits 0 and prints `[verify] PASS: <design> — all properties hold at depth 20`

#### Scenario: verify script exits 1 on violated property
- **WHEN** the bounded model checker finds a counterexample within depth 20
- **THEN** the script exits 1 and prints `[verify] FAIL: <design>`

### Requirement: TypeScript property specification API accepts arrow functions
The `@ts2v/runtime` package SHALL export `@Assert` and `@Assume` decorators typed as class decorators accepting an arrow function `() => boolean` and an optional string label, enabling IDE autocompletion and TypeScript type checking.

#### Scenario: @Assert typed as class decorator with arrow function
- **WHEN** a user writes `@Assert(() => this.count < 256)` on a `@Module` class
- **THEN** TypeScript type checking succeeds, the decorator is accepted as a class decorator, and no type error is raised

#### Scenario: Arrow function body is extracted by compiler
- **WHEN** `@Assert(() => this.counter <= MAX_VAL)` is compiled
- **THEN** the compiler extracts `this.counter <= MAX_VAL` from the arrow function body and uses it as the SVA condition, with `MAX_VAL` substituted if it is a top-level `const`

