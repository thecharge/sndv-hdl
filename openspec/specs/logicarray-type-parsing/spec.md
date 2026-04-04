## ADDED Requirements

### Requirement: LogicArray type recognition
The class compiler's `parseTypeSpec` function SHALL recognise the identifier `LogicArray` and parse its two generic arguments `<W, SIZE>` into a `PropertyAST` node with `is_array: true`, `bit_width: W`, `array_size: SIZE`.

#### Scenario: Valid LogicArray declaration is parsed correctly
- **WHEN** a class property is annotated as `LogicArray<8, 4>` and the class compiler parses it
- **THEN** the resulting `PropertyAST` has `is_array: true`, `bit_width: 8`, `array_size: 4`

#### Scenario: LogicArray with size zero is rejected
- **WHEN** a class property is annotated as `LogicArray<8, 0>` (or `SIZE` evaluates to zero)
- **THEN** the compiler emits a diagnostic with code `ERROR_ARRAY_SIZE_REQUIRED` and compilation fails

#### Scenario: Existing Logic<N>[] declarations remain unaffected
- **WHEN** a class property uses the `Logic<8>[]` form with a separate array-size annotation
- **THEN** the property compiles identically to before; no regression occurs

### Requirement: Array size enforcement at emission
The class-module emitter SHALL check that `array_size > 0` for every `is_array: true` property before emitting the `logic [W-1:0] name [0:SIZE-1]` declaration. If `array_size` is zero or missing, the emitter SHALL emit a `CompilerError` using the `ERROR_ARRAY_SIZE_REQUIRED` error code and abort emission of that module.

#### Scenario: Missing array size produces a diagnostic
- **WHEN** a `Logic<8>[]` property has no size annotation and no initializer from which the typechecker can infer a size
- **THEN** the compiler emits a diagnostic with code `ERROR_ARRAY_SIZE_REQUIRED` including the property name

## MODIFIED Requirements

### Requirement: Supported hardware types in the class compiler
The class compiler SHALL support the following type annotations on class properties: `Logic<N>`, `Bit`, `Uint8`, `Uint16`, `Uint32`, `Uint64`, `number`, `boolean`, `Logic<N>[]` with explicit size, and `LogicArray<W, SIZE>`. The `LogicArray<W, SIZE>` form is equivalent to `Logic<W>[]` with array size `SIZE` and SHALL produce identical SystemVerilog output.

#### Scenario: LogicArray generates correct SV declaration
- **WHEN** a class property is declared as `LogicArray<8, 4>` and the module is emitted
- **THEN** the emitted SystemVerilog contains `logic [7:0] <property_name> [0:3];`

#### Scenario: LogicArray indexed write in Sequential emits nonblocking assignment
- **WHEN** a `@Sequential` method assigns `this.arr[i] = value` where `arr` is `LogicArray<8, 4>`
- **THEN** the emitted SystemVerilog inside the `always_ff` block contains `arr[<i>] <= <value>;`
