# ts2v API Reference

Generated from `src/index.ts` and module barrel exports.

## Public API (src/index.ts)

```typescript
// Core pipeline
import { CompilerPipeline, CompilationResult } from 'ts2v';

// Individual stages
import { Lexer, Token, TokenKind } from 'ts2v';
import { Parser, ProgramNode, AstNodeKind, TypeName } from 'ts2v';
import { TypeChecker, CheckedFunction, HardwareType, HardwareTypeKind } from 'ts2v';
import { VerilogEmitter } from 'ts2v';

// Configuration
import { CompilerConfig, BASE_CONFIG, mergeConfig } from 'ts2v';

// Errors
import { CompilerError } from 'ts2v';
```

## CompilerPipeline

Primary entry point. Orchestrates lexer -> parser -> typechecker -> codegen.

```typescript
const pipeline = new CompilerPipeline(configOverlay?);
const result: CompilationResult = pipeline.compile(source: string);

// result.success    - boolean
// result.verilog    - string (generated Verilog)
// result.tokens     - Token[]
// result.ast        - ProgramNode
// result.errors     - CompilerError[]
```

## Module internals (via barrel exports)

### src/lexer/index.ts

| Export | Source | Description |
|--------|--------|-------------|
| `Lexer` | lexer.ts | Tokenizer (extends CharReader) |
| `CharReader` | char-reader.ts | Character-level reading, whitespace/comment skipping |
| `Token` | token.ts | Token interface: kind, value, line, column |
| `TokenKind` | token.ts | Enum of all token types (63 variants) |
| `KEYWORD_TOKEN_MAP` | token.ts | Map<string, TokenKind> for keyword lookup |

### src/parser/index.ts

| Export | Source | Description |
|--------|--------|-------------|
| `Parser` | parser.ts | Declarations and statements (extends ExpressionParser) |
| `TokenReader` | token-reader.ts | Base class: peek, advance, check, expect |
| `ExpressionParser` | expression-parser.ts | Precedence climbing for all expressions |
| `ProgramNode` | ast.ts | Root AST node |
| `AstNodeKind` | ast.ts | Enum of all AST node kinds |
| `TypeName` | ast.ts | Enum: Number, Boolean, NumberArray, BooleanArray |

### src/typechecker/index.ts

| Export | Source | Description |
|--------|--------|-------------|
| `TypeChecker` | typechecker.ts | Function-level type checking |
| `CheckedFunction` | typechecker.ts | Metadata: name, params, return type, locals |
| `TypeEnvironment` | type-environment.ts | Scoped symbol table |
| `SymbolEntry` | type-environment.ts | Symbol: name, hardware_type, is_const |
| `checkExpression` | expression-checker.ts | Expression type inference |
| `TYPE_MAP` | expression-checker.ts | WeakMap<ExpressionNode, HardwareType> |
| `HardwareType` | hardware-type.ts | Wire/Register with bit_width, is_signed |
| `HardwareTypeKind` | hardware-type.ts | Enum: Wire, Register, WireArray, RegisterArray |

### src/codegen/index.ts

| Export | Source | Description |
|--------|--------|-------------|
| `VerilogEmitter` | verilog-emitter.ts | Module-level code generation |
| `renderExpression` | expression-emitter.ts | Expression -> Verilog string |
| `sanitizeIdentifier` | expression-emitter.ts | Escapes Verilog reserved words |

### src/lint/index.ts

| Export | Source | Description |
|--------|--------|-------------|
| `lintVerilog` | verilog-linter.ts | Structural lint: modules, ports, assigns, multi-driven |
| `LintDiagnostic` | verilog-linter.ts | Lint result: line, severity, message, rule |

### src/config/index.ts

| Export | Source | Description |
|--------|--------|-------------|
| `CompilerConfig` | compiler-config.ts | Config interface |
| `BASE_CONFIG` | compiler-config.ts | Default configuration object |
| `mergeConfig` | compiler-config.ts | Shallow merge: base + overlay |
| `parseConfigOverlay` | compiler-config.ts | JSON string -> config object |

### src/errors/index.ts

| Export | Source | Description |
|--------|--------|-------------|
| `CompilerError` | compiler-error.ts | Error with line, column, error_code |
| `lexerError` | compiler-error.ts | Factory: TS2V-1000 errors |
| `parserError` | compiler-error.ts | Factory: TS2V-2000 errors |
| `typeError` | compiler-error.ts | Factory: TS2V-3000 errors |
| `codegenError` | compiler-error.ts | Factory: TS2V-4000 errors |
