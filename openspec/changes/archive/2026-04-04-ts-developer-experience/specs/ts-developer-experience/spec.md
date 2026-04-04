## ADDED Requirements

### Requirement: Runtime branded types carry bit-width in type system
`Logic<N>`, `Bit`, and `UintN` type aliases SHALL be branded so that the bit-width generic `N` is visible in editor hover and contributes to type compatibility checks. `LogicArray<W, SIZE>` SHALL be a branded array type carrying `W` and `SIZE`.

#### Scenario: Logic<8> hover shows bit width
- **WHEN** a developer hovers over a property typed as `Logic<8>` in an IDE with TypeScript support
- **THEN** the hover tooltip includes the type parameter `8` (e.g., `Logic<8>`)

#### Scenario: Branded Logic is assignable from number
- **WHEN** code assigns a plain `number` to a `Logic<8>` variable
- **THEN** TypeScript compiles without error (no breaking change)

### Requirement: Structured diagnostic location
`CompileDiagnostic` SHALL include an optional `location` field with `filePath?: string; line?: number; column?: number`. The legacy compiler adapter SHALL propagate `CompilerError.location` into the `CompileDiagnostic` location field when available.

#### Scenario: Parser error includes file and line
- **WHEN** the compiler encounters a parse error at line 12 column 5 of `my_module.ts`
- **THEN** the returned `CompileDiagnostic` has `location: { filePath: "my_module.ts", line: 12, column: 5 }`

#### Scenario: CLI diagnostic output includes location
- **WHEN** the CLI prints a diagnostic with a location
- **THEN** the output includes `my_module.ts:12:5` in the message line

### Requirement: Machine-readable diagnostic output
The CLI SHALL support a `--diagnostics=json` flag that emits each `CompileDiagnostic` as a separate JSON object on its own line (NDJSON format) to stdout.

#### Scenario: JSON diagnostic output format
- **WHEN** the user runs the CLI with `--diagnostics=json` and compilation produces an error
- **THEN** stdout contains one JSON line per diagnostic with `severity`, `code`, `message`, and `location` fields

### Requirement: Testbench spec types exported from @ts2v/types
`SeqTestSpec`, `CombTestSpec`, and `TbSpec` SHALL be exported from `@ts2v/types` so that external projects can import them with `import type { SeqTestSpec } from '@ts2v/types'`.

#### Scenario: External import of SeqTestSpec
- **WHEN** a user project imports `import type { SeqTestSpec } from '@ts2v/types'`
- **THEN** the import resolves without error and the type is available

### Requirement: HardwareModule base class does not suppress subclass field types
`HardwareModule` SHALL NOT include an index signature (`[key: string]: unknown`). Subclass fields decorated with `@Input`, `@Output`, etc. SHALL be accessible with their declared types without casting.

#### Scenario: Subclass property is typed without casting
- **WHEN** a hardware module subclass has `@Input led: Logic<6>` declared
- **THEN** TypeScript resolves `this.led` as `Logic<6>` without requiring a cast or `as` assertion

### Requirement: All exported runtime and types symbols have JSDoc
Every exported symbol in `packages/runtime/src/types.ts`, `packages/runtime/src/decorators.ts`, `packages/runtime/src/module.ts`, and `packages/types/src/*.ts` SHALL have a JSDoc comment that includes a one-sentence description and, where applicable, an example.

#### Scenario: Decorator JSDoc appears in editor hover
- **WHEN** a developer hovers over `@Sequential` in a TypeScript-aware IDE
- **THEN** the hover tooltip shows the JSDoc description and the `clock` parameter documentation
