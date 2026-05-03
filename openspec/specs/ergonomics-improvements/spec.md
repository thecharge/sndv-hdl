# ergonomics-improvements Specification

## Purpose
TBD - created by archiving change platform-expansion-v1. Update Purpose after archive.
## Requirements
### Requirement: LogicArray array-size inference from initialiser
The compiler SHALL infer the `LogicArray` array size (second generic parameter) from an array literal initialiser when the SIZE argument is omitted from the type annotation. The bit width (first generic parameter) remains required.

#### Scenario: Array literal initialiser infers SIZE
- **WHEN** a module field is declared as `private pixels: LogicArray<24> = [0, 0, 0, 0, 0, 0, 0, 0]`
- **THEN** the compiler infers `SIZE = 8` from the 8-element literal and emits `logic [23:0] pixels [0:7]`

#### Scenario: Explicit SIZE still accepted
- **WHEN** a field is declared as `private pixels: LogicArray<24, 8> = [0, 0, 0, 0, 0, 0, 0, 0]`
- **THEN** the compiler uses the explicit SIZE 8 and emits `logic [23:0] pixels [0:7]`

#### Scenario: LogicArray with bit width and SIZE explicitly specified compiles unchanged
- **WHEN** a field is declared with both generic arguments present
- **THEN** the compiler does not attempt inference and uses the explicitly provided values

