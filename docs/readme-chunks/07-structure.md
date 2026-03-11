## Project Structure

```
ts2v-work/
├── src/
│   ├── cli.ts                          # Build CLI (ts2v build)
│   ├── class-compiler/
│   │   └── class-module-compiler.ts    # @Module class → SV pipeline
│   ├── lexer/
│   │   ├── lexer.ts                    # Tokenizer (class, enum, @, this, switch...)
│   │   ├── char-reader.ts
│   │   └── token.ts
│   ├── parser/
│   │   ├── parser.ts                   # Function-mode parser
│   │   ├── expression-parser.ts
│   │   └── ast.ts
│   ├── typechecker/
│   │   ├── typechecker.ts
│   │   └── hardware-type.ts
│   ├── codegen/
│   │   ├── verilog-emitter.ts          # Function-mode emitter
│   │   └── expression-emitter.ts
│   ├── constraints/
│   │   └── board-constraint-gen.ts     # board.json → .cst/.xdc/.qsf/.lpf
│   ├── errors/
│   │   └── compiler-error.ts
│   └── constants/
│       └── strings.ts
├── tests/
│   ├── lexer.test.ts                   # 54 tests
│   ├── parser.test.ts                  # 44 tests
│   ├── typechecker.test.ts             # 38 tests
│   ├── codegen.test.ts                 # 73 tests
│   ├── integration.test.ts             # 36 tests
│   ├── class-compiler.test.ts          # 18 tests
│   ├── cpu-compile.test.ts             # 22 tests
│   ├── golden.test.ts                  # 78 tests
│   └── lint.test.ts                    # 29 tests
├── cpu/
│   ├── ts/                             # CPU source (TypeScript)
│   │   ├── nibble4_core.ts             # 4-bit CPU core
│   │   ├── nibble4_soc.ts              # Arbiter + Memory + UART
│   │   └── nibble4_dual_soc.ts         # Dual-core top
│   └── build/                          # Generated SystemVerilog
│       ├── nibble4_core.sv             # 282 lines
│       ├── nibble4_soc.sv              # 252 lines
│       └── tb_nibble4_core.sv          # Testbench
├── configs/
│   ├── tang_nano_9k.board.json         # Gowin GW1NR-9C
│   ├── arty_a7.board.json              # Xilinx Artix-7
│   └── de10_nano.board.json            # Intel Cyclone V
├── examples/                           # 10 TypeScript hardware designs
│   ├── blinker.ts, uart_tx.ts, pwm.ts, alu.ts, ...
└── package.json
```
