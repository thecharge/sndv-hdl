# ts2v Architecture

## Pipeline Overview

The transpiler follows a classic 4-stage compiler pipeline.
Each stage has a single responsibility and produces a well-defined artifact.

```mermaid
flowchart LR
    A["TypeScript Source"] --> B["Lexer"]
    B --> C["Token Stream"]
    C --> D["Parser"]
    D --> E["AST"]
    E --> F["Type Checker"]
    F --> G["Typed AST + Metadata"]
    G --> H["Code Generator"]
    H --> I["SystemVerilog Source (.sv)"]
```

## Module Structure

```mermaid
graph TD
    CLI["cli.ts"] --> Pipeline["pipeline/compiler-pipeline.ts"]
    Pipeline --> Lexer["lexer/lexer.ts"]
    Pipeline --> Parser["parser/parser.ts"]
    Pipeline --> TypeChecker["typechecker/typechecker.ts"]
    Pipeline --> CodeGen["codegen/verilog-emitter.ts"]
    
    Lexer --> Token["lexer/token.ts"]
    Parser --> AST["parser/ast.ts"]
    TypeChecker --> HWType["typechecker/hardware-type.ts"]
    TypeChecker --> TypeEnv["typechecker/type-environment.ts"]
    
    Pipeline --> Config["config/compiler-config.ts"]
    
    Lexer --> Errors["errors/compiler-error.ts"]
    Parser --> Errors
    TypeChecker --> Errors
    CodeGen --> Errors
```

## Translation Flow: TypeScript Function to SystemVerilog Module

```mermaid
flowchart TD
    A["function add(a: number, b: number): number"] --> B["Parameters → Input Ports"]
    A --> C["Return Type → Output Port"]
    A --> D["Body → Combinational Logic"]

    B --> E["input logic [31:0] a"]
    B --> F["input logic [31:0] b"]
    C --> G["output logic [31:0] result"]
    D --> H["assign result = (a + b)"]
```

## Type Mapping

```mermaid
graph LR
    TS_Number["TypeScript: number"]     --> SV_Logic32["SystemVerilog: logic [31:0]"]
    TS_Bool["TypeScript: boolean"]       --> SV_Logic1["SystemVerilog: logic"]
    TS_LogicN["TypeScript: Logic&lt;N&gt;"]   --> SV_LogicN["SystemVerilog: logic [N-1:0]"]
    TS_NumArr["TypeScript: number[N]"]   --> SV_Arr["SystemVerilog: logic [31:0] arr[0:N-1]"]
    TS_BoolArr["TypeScript: boolean[N]"] --> SV_Arr1["SystemVerilog: logic arr[0:N-1]"]
```

## Operator Precedence (Parsing)

The parser uses precedence climbing with these levels (lowest to highest):

```mermaid
graph TD
    L1["Assignment (=)"] --> L2["Bitwise OR (|)"]
    L2 --> L3["Bitwise XOR (^)"]
    L3 --> L4["Bitwise AND (&)"]
    L4 --> L5["Equality (=== !==)"]
    L5 --> L6["Comparison (> < >= <=)"]
    L6 --> L7["Shift (<< >>)"]
    L7 --> L8["Additive (+ -)"]
    L8 --> L9["Multiplicative (*)"]
    L9 --> L10["Unary (~ -)"]
    L10 --> L11["Primary (literals, identifiers, parens)"]
```

## Config Overlay System

Configs merge in layers. Each layer overrides values from the previous.

```mermaid
flowchart LR
    Base["base.config.json"] --> Board["board.config.json"]
    Board --> User["user.config.json"]
    User --> Final["Final Merged Config"]
```

## Error Handling Strategy

All errors carry a source location and an error code prefix.

```mermaid
graph TD
    E["CompilerError"] --> L["TS2V-1000: Lexer Errors"]
    E --> P["TS2V-2000: Parser Errors"]
    E --> T["TS2V-3000: Type Errors"]
    E --> C["TS2V-4000: CodeGen Errors"]
```

## File Layout

```
ts2v/
  src/
    constants/         Numeric, string, keyword constants
    errors/            CompilerError with source location
    lexer/             Tokenizer (token.ts, lexer.ts)
    parser/            AST definitions and recursive descent parser
    typechecker/       Type resolution and validation
    codegen/           Verilog source emission
    pipeline/          Orchestrates all stages
    config/            Layered config with merge support
    cli.ts             Command-line entry point
    index.ts           Public API barrel export
  tests/               Unit and integration tests
  examples/            Sample TypeScript hardware descriptions
  configs/             Base and board config files
  docs/                Architecture and specification documents
```
