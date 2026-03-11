# ts2v API Documentation

Auto-generated from source comments.

---

## codegen/verilog-emitter.ts

### method: `emit`

Generate Verilog source for the entire program.
@param program - The parsed ProgramNode AST.
@returns Complete Verilog source as a string.
@example
const verilog = new VerilogEmitter(checkedFunctions).emit(ast);
/

```typescript
emit(program: ProgramNode): string {
```

## config/compiler-config.ts

### function: `mergeConfig`

Merge a partial config overlay on top of a base config.
Performs a shallow merge per section (project, hardware, output).
@param base - The base configuration.
@param overlay - Partial overrides to apply.
@returns Merged configuration.
@example
const config = mergeConfig(BASE_CONFIG, { project: { name: 'my_alu' } });
/

```typescript
export function mergeConfig(base: CompilerConfig, overlay: Partial<DeepPartial<CompilerConfig>>): CompilerConfig {
```

### function: `parseConfigOverlay`

Parse a JSON string into a partial config overlay.
@param json_string - Raw JSON config content.
@returns Parsed partial config for merging.
/

```typescript
export function parseConfigOverlay(json_string: string): Partial<DeepPartial<CompilerConfig>> {
```

## lexer/lexer.ts

### method: `tokenize`

Tokenize the entire source into a token array.
@returns Array of tokens ending with EndOfFile.
@example
const tokens = new Lexer('const x: number = 5;').tokenize();
/

```typescript
tokenize(): Token[] {
```

## parser/parser.ts

### method: `parse`

Parse all tokens into a ProgramNode AST root.
@returns The root AST node containing all function declarations.
@example
const ast = new Parser(tokens).parse();
/

```typescript
parse(): ProgramNode {
```

## pipeline/compiler-pipeline.ts

### method: `compile`

Run the full compilation pipeline on TypeScript source code.
@param source - TypeScript source string.
@returns CompilationResult with all intermediate artifacts.
@example
const result = new CompilerPipeline().compile('function add(a: number, b: number): number { return a + b; }');
console.log(result.verilog);
/

```typescript
compile(source: string): CompilationResult {
```

### method: `lex`

Run only the lexer stage.
@param source - TypeScript source string.
@returns Token array.
/

```typescript
lex(source: string): Token[] {
```

### method: `parse`

Run lexer and parser stages.
@param source - TypeScript source string.
@returns Parsed AST.
/

```typescript
parse(source: string): ProgramNode {
```

## typechecker/typechecker.ts

### method: `check`

Type-check the entire program AST.
@param program - The parsed ProgramNode.
@returns Array of checked function metadata for code generation.
@example
const checker = new TypeChecker();
const functions = checker.check(ast);
/

```typescript
check(program: ProgramNode): CheckedFunction[] {
```
