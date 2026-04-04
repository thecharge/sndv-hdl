## ADDED Requirements

### Requirement: Param decorator recognition
The class compiler SHALL recognise the `@Param` property decorator and record the decorated property as a module-level SV `parameter` in the `ClassModuleAST`. The property SHALL NOT be emitted as a port, localparam, or internal signal.

#### Scenario: @Param property produces a parameter declaration
- **WHEN** a class property is decorated with `@Param` and has a numeric literal default value
- **THEN** the emitted SystemVerilog module header contains `#(parameter logic [W-1:0] NAME = DEFAULT)` where `W` is the property's bit width and `DEFAULT` is the literal value

#### Scenario: @Param property with no default value is rejected
- **WHEN** a class property is decorated with `@Param` and has no initialiser
- **THEN** the compiler emits a diagnostic and compilation fails

### Requirement: Parameter override on submodule instantiation
When a submodule class has `@Param`-decorated properties, the parent module's submodule instantiation SHALL emit `#(.NAME(VALUE))` parameter overrides using the values provided at the point of submodule construction.

#### Scenario: Submodule instantiated with parameter override
- **WHEN** a parent module instantiates a submodule that has a `@Param` property and provides an override value
- **THEN** the emitted SV instantiation contains `#(.PARAM_NAME(OVERRIDE_VALUE))` before the port list

#### Scenario: Submodule instantiated without override uses default
- **WHEN** a parent module instantiates a submodule with a `@Param` property and provides no override
- **THEN** the emitted SV instantiation has no `#(...)` clause and the module uses its declared default parameter value

### Requirement: Parameter name uniqueness
Parameter names SHALL be unique within a module and SHALL NOT collide with port or internal signal names.

#### Scenario: Parameter name collision is rejected
- **WHEN** a class has a `@Param`-decorated property with the same name as an `@Input` or `@Output` property
- **THEN** the compiler emits a `CompilerError` and compilation fails

## MODIFIED Requirements

### Requirement: Module signature includes parameters
`ModuleSignature` SHALL include a `parameters` array alongside `inputs` and `outputs`. Each entry SHALL carry `name: string`, `bit_width: number`, and `default_value: number`.

#### Scenario: Signature is registered with parameters
- **WHEN** a module class with `@Param` properties is parsed and its signature is registered
- **THEN** `ModuleSignature.parameters` contains one entry per `@Param` property with correct `name`, `bit_width`, and `default_value`
