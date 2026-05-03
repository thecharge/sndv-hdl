# ts-to-sv-compiler-core Specification

## Purpose
TBD - created by archiving change platform-expansion-v1. Update Purpose after archive.
## Requirements
### Requirement: Compiler recognises multiple named clock domains per module
The class-module compiler SHALL accept multiple clock domains per module via the `@ClockDomain` decorator and track domain membership in the AST for all `@Sequential` blocks.

#### Scenario: ClassModuleAST holds clocks array
- **WHEN** a `@Module` class is decorated with two `@ClockDomain` calls
- **THEN** the parsed `ClassModuleAST` node contains a `clocks` array with both domain entries

#### Scenario: Sequential block binds to named domain clock
- **WHEN** a `@Sequential` block specifies a clock name matching a declared `@ClockDomain`
- **THEN** the emitter uses that domain's clock port in the `always_ff` sensitivity list

### Requirement: Codegen emits multi-clock always_ff blocks
The `ClassSequentialEmitter` SHALL emit separate `always_ff` blocks for each clock domain present in a module, each with the correct sensitivity list derived from the domain's clock and reset configuration.

#### Scenario: Two domains emit two always_ff blocks
- **WHEN** a module has one `@Sequential` block in domain `sys` and one in domain `usb`
- **THEN** the generated SV contains two distinct `always_ff` blocks with `posedge sys_clk` and `posedge usb_clk` respectively

### Requirement: CDC synchroniser emission integrated in codegen pipeline
The `ClassModuleEmitter` SHALL recognise `ClockDomainCrossing` and `AsyncFifo` instantiations from `@ts2v/stdlib/cdc` and emit the corresponding SV synchroniser circuits.

#### Scenario: ClockDomainCrossing maps to two-FF SV
- **WHEN** a module instantiates `ClockDomainCrossing<Logic>` from `@ts2v/stdlib/cdc`
- **THEN** the emitter produces a two-register always_ff chain clocked by the destination domain's clock

### Requirement: Constraint generator emits multi-domain clock entries
The board constraint generator SHALL emit one `create_clock` entry per declared `@ClockDomain` when the design includes multiple clock domains.

#### Scenario: Multi-domain design constraint file
- **WHEN** a design with two `@ClockDomain` declarations is compiled with `--clock-constraints`
- **THEN** the output SDC contains two `create_clock` entries, one per domain

