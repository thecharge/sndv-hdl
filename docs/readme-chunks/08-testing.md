## Testing

```bash
# Run all 392 tests
npm test

# Run specific test suites
npx ts-node --test tests/class-compiler.test.ts   # Class module compiler (18 tests)
npx ts-node --test tests/cpu-compile.test.ts       # CPU compilation (22 tests)
npx ts-node --test tests/lexer.test.ts             # Lexer (54 tests)
npx ts-node --test tests/codegen.test.ts           # Code generation (73 tests)
npx ts-node --test tests/golden.test.ts            # Golden output comparison (78 tests)
npx ts-node --test tests/lint.test.ts              # Verilator lint (29 tests)
```

### Test Categories

| Suite | Count | What it verifies |
|-------|-------|------------------|
| Lexer | 54 | Tokenization of class, enum, @, this, switch, ++, +=, ! |
| Parser | 44 | AST construction for functions |
| TypeChecker | 38 | Bit-width inference, type compatibility |
| CodeGen | 73 | Verilog emission (function mode) |
| ClassCompiler | 18 | @Module class → always_ff/always_comb, enums, ports, reset |
| CPU Compile | 22 | nibble4 TS → SV (core, SoC), reset polarity, ISA verification |
| Golden | 78 | Byte-exact output comparison against reference files |
| Integration | 36 | End-to-end TS file → SV file |
| Lint | 29 | Generated SV passes structural checks |
