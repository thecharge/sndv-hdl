## ADDED Requirements

### Requirement: Bits.slice intrinsic
The class compiler SHALL recognise calls of the form `Bits.slice(signal, msb, lsb)` as a compiler intrinsic and translate them to the SystemVerilog part-select expression `signal[msb:lsb]`.

#### Scenario: Bits.slice with literal bounds
- **WHEN** a `@Combinational` or `@Sequential` method contains `Bits.slice(this.bus, 7, 0)` where `bus` is a `Logic<16>` signal
- **THEN** the emitted SystemVerilog expression is `bus[7:0]`

#### Scenario: Bits.slice result type with literal bounds
- **WHEN** `Bits.slice(signal, 7, 0)` appears in an expression and both bounds are numeric literals
- **THEN** the typechecker infers the result type as `Logic<8>` (bit_width = msb - lsb + 1 = 8)

#### Scenario: Bits.slice with non-literal bounds
- **WHEN** `Bits.slice(signal, msb_var, lsb_var)` appears in an expression and the bounds are variables
- **THEN** the emitted expression is `signal[msb_var:lsb_var]` and the typechecker conservatively types the result as `Logic<1>`

### Requirement: Bits.bit intrinsic
The class compiler SHALL recognise calls of the form `Bits.bit(signal, i)` as a compiler intrinsic and translate them to the SystemVerilog single-bit select expression `signal[i]`.

#### Scenario: Bits.bit single-bit select
- **WHEN** a method contains `Bits.bit(this.reg, 3)` where `reg` is a `Logic<8>` signal
- **THEN** the emitted SystemVerilog expression is `reg[3]`

### Requirement: Bits namespace is a reserved compiler token
The identifier `Bits` when used as a qualifier for `slice` or `bit` SHALL be treated as a compiler intrinsic namespace. The compiler SHALL emit a warning (non-fatal) if the user defines a local variable or class named `Bits`.

#### Scenario: User-defined Bits variable triggers warning
- **WHEN** a hardware class declares a property named `bits` (case-insensitive match is not required; only exact `Bits` triggers the warning)
- **THEN** the compiler emits a warning diagnostic indicating potential shadowing of the `Bits` intrinsic namespace
