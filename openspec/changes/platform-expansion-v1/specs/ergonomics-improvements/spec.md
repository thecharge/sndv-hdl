## ADDED Requirements

### Requirement: SignalBus type helper
The `@ts2v/runtime` package SHALL export a `SignalBus<T>` generic type that groups related signals into a named bus record, reducing repetitive port declarations.

#### Scenario: SignalBus port group compiles
- **WHEN** a module declares an input port of type `SignalBus<{ data: LogicArray<8>; valid: Logic; ready: Logic }>`
- **THEN** the compiler expands the bus to three individual ports in the generated SV

### Requirement: Reg helper type
The `@ts2v/runtime` package SHALL export a `Reg<T>` type alias that marks a variable as a registered (flip-flop) value, enabling IDE autocompletion and compile-time checks.

#### Scenario: Reg variable used in Sequential block
- **WHEN** a module declares `const counter: Reg<LogicArray<8>> = 0` and increments it in a `@Sequential` block
- **THEN** the compiler emits an `always_ff` register for `counter`

### Requirement: Edge detection helpers
The `@ts2v/runtime` package SHALL export `rising(signal: Logic): Logic` and `falling(signal: Logic): Logic` functions that the compiler translates to single-cycle edge-detect logic in the generated SV.

#### Scenario: rising() generates edge detect
- **WHEN** a `@Combinational` block uses `rising(btn)` in a condition
- **THEN** the generated SV contains a one-cycle delayed register and XOR/AND edge detect logic for `btn`

### Requirement: @Hardware shorthand decorator
The `@ts2v/runtime` package SHALL export a `@Hardware` decorator that, when applied to a method, causes the compiler to infer whether the method is sequential or combinational based on whether it reads a clock signal, and emits the corresponding `always_ff` or `always_comb` block.

#### Scenario: @Hardware method without clock -> always_comb
- **WHEN** a method decorated with `@Hardware` reads only combinational inputs
- **THEN** the compiler emits `always_comb` for that method

#### Scenario: @Hardware method with clock -> always_ff
- **WHEN** a method decorated with `@Hardware` reads a clock signal (via `rising()` or direct clock port reference)
- **THEN** the compiler emits `always_ff` for that method

### Requirement: Improved error messages with source location
The compiler SHALL include the TypeScript source file path, line number, and column number in all error and warning messages.

#### Scenario: Type mismatch error includes location
- **WHEN** a port assignment has a type mismatch
- **THEN** the error message includes `file.ts:line:col:` prefix and a human-readable description

## MODIFIED Requirements

### Requirement: LogicArray width type inference
The compiler SHALL infer `LogicArray` bit width from initialiser literals and arithmetic expressions where the width is statically determinable, removing the need for explicit width annotations in simple cases.

#### Scenario: Literal initialiser infers width
- **WHEN** a variable is declared as `const x: LogicArray = 0b1010` (no explicit width)
- **THEN** the compiler infers width 4 and emits `logic [3:0] x`

#### Scenario: Explicit width still accepted
- **WHEN** a variable is declared as `const x: LogicArray<8> = 0`
- **THEN** the compiler uses the explicit width 8 and emits `logic [7:0] x`
