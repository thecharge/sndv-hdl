# ts2v Architecture

## Monorepo Layout

```
apps/
  cli/                        - CLI entry point and argument parsing
packages/
  core/                       - Compiler facade, class compiler, legacy compiler
  runtime/                    - TypeScript decorators and hardware type definitions
  stdlib/                     - Reusable hardware IP: UART, SPI, I2C, I3C, WS2812,
  |                             CAN, PWM, 1-Wire, VGA, HDMI, CDC, async FIFO, USB FS
  toolchain/                  - Synthesis and flash adapters (Yosys, nextpnr, openFPGALoader)
  config/                     - Workspace and board configuration services
  process/                    - Process execution abstraction
  types/                      - Shared interfaces and contracts
boards/                       - Board definition JSON files
examples/
  hardware/<board>/<name>/    - Hardware examples (TypeScript source only)
  cpu/nibble4/                - nibble4 4-bit CPU + bootloader + assembler + programs
  <name>/                     - Simulation examples
testbenches/                  - TypeScript UVM-style testbench specs (SeqTestSpec / CombTestSpec)
tests/                        - Root regression test suite
```

## Compilation Pipeline

Two compilation modes are supported. Class mode is the primary path for all
hardware examples. Function mode handles legacy single-function designs.

```mermaid
flowchart TD
    CLI["apps/cli/src/commands/compile-command-handler.ts"]
    CLI --> Facade["packages/core/src/facades/ts2v-compilation-facade.ts"]
    Facade --> Adapter["packages/core/src/adapters/legacy-compiler-adapter.ts"]

    Adapter -->|class mode| ClassCompiler["class-compiler/class-module-compiler.ts"]
    Adapter -->|function mode| FuncEngine["compiler/compiler-engine.ts"]

    ClassCompiler --> Parser["class-module-parser.ts\nparses decorators, consts, modules\n@ClockDomain / multi-clock"]
    ClassCompiler --> Emitter["class-module-emitter.ts\nemits SV modules\none always_ff per clock domain"]
    ClassCompiler --> CDCPass["CDC detection pass\nwarn on unguarded crossings\nClockDomainCrossing / AsyncFifo accepted"]

    FuncEngine --> Lexer["lexer/lexer.ts"]
    FuncEngine --> FuncParser["parser/parser.ts"]
    FuncEngine --> TypeChecker["typechecker/typechecker.ts"]
    FuncEngine --> VerilogEmitter["codegen/verilog-emitter.ts"]

    Adapter --> ConstraintGen["constraints/board-constraint-gen.ts\ngenerates .cst or .xdc\ncreate_clock per @ClockDomain"]
```

## @ts2v/stdlib Package

The stdlib provides synthesisable hardware IP as TypeScript classes that compile
to clean SystemVerilog through the ts2v class compiler.

```mermaid
graph TD
    stdlib["@ts2v/stdlib"] --> cdc["cdc/\nClockDomainCrossing\nAsyncFifo"]
    stdlib --> uart["uart/\nUartTx  UartRx"]
    stdlib --> spi["spi/\nSpiController  SpiPeripheral"]
    stdlib --> i2c["i2c/\nI2cController  I2cPeripheral"]
    stdlib --> i3c["i3c/\nI3cController"]
    stdlib --> ws2812["ws2812/\nWs2812Serialiser"]
    stdlib --> can["can/\nCanController"]
    stdlib --> pwm["pwm/\nPwmGenerator"]
    stdlib --> onewire["onewire/\nOneWireController"]
    stdlib --> usb["usb/\nUsbFsDevice"]
    stdlib --> vga["vga/\nVgaTimingGenerator"]
    stdlib --> hdmi["hdmi/\nHdmiDviOutput"]
```

## Multi-Clock Domain Support

`@ClockDomain` registers named clock domains on a module. The compiler emits
one `always_ff` block per domain and wires named clock ports automatically.
CDC crossings are detected: `ClockDomainCrossing<Logic>` (two-FF sync) and
`AsyncFifo<T, Depth>` (gray-code dual-clock FIFO) are the approved primitives.

```mermaid
flowchart LR
    TS["@ClockDomain('sys', {freq:27e6})\n@ClockDomain('fast', {freq:135e6})"]
    TS --> Parser["class-module-parser\ncollects clock domains"]
    Parser --> SeqEmitter["ClassSequentialEmitter\nemits always_ff per domain"]
    SeqEmitter --> SV["always_ff @(posedge sys_clk)\nalways_ff @(posedge fast_clk)"]
    TS --> ConstraintGen
    ConstraintGen --> CST["create_clock -period 37.04 [get_nets sys_clk]\ncreate_clock -period 7.41  [get_nets fast_clk]"]
```

## Multi-File Directory Compilation

When the input path is a directory, `LegacyCompilerAdapter` collects all
`.ts` files, strips import statements (they are TypeScript-only hints, not
synthesized), concatenates all sources into one string, and passes the result
to class mode compilation. This is how multi-module designs like
`examples/hardware/tang_nano_20k/ws2812_demo/` are compiled.

```mermaid
flowchart LR
    Dir["input directory"] --> Collect["collect all .ts files"]
    Collect --> Strip["strip import/export lines"]
    Strip --> Concat["concatenate sources"]
    Concat --> ClassMode["class mode compilation"]
    ClassMode --> SV["single .sv with all modules"]
```

## Class Compiler Internals

```mermaid
graph TD
    Source["TypeScript source"] --> Parser["ClassModuleParser"]
    Parser --> Enums["EnumAST list"]
    Parser --> Consts["TopLevelConstAST list"]
    Parser --> Modules["ClassModuleAST list"]

    Emitter["ClassModuleEmitter"] --> Consts
    Emitter --> Enums
    Emitter --> Modules
    Emitter --> SeqEmitter["ClassSequentialEmitter"]
    Emitter --> BaseEmitter["EmitterBase.translateExpr()"]

    BaseEmitter -->|"substitutes const names"| InlinedSV["sized SV literals"]
```

### Key source files under `packages/core/src/compiler/class-compiler/`

| File                          | Responsibility                                            |
| ----------------------------- | --------------------------------------------------------- |
| `class-module-ast.ts`         | AST node types: EnumAST, ClassModuleAST, TopLevelConstAST |
| `class-module-parser-base.ts` | Token navigation helpers                                  |
| `class-module-parser.ts`      | Parses decorators, classes, enums, top-level consts       |
| `class-stmt-parser.ts`        | Parses statement bodies (if/else, switch, assignments)    |
| `class-decl-parser.ts`        | Parses field declarations and decorators                  |
| `class-module-emitter.ts`     | Emits SV module headers, port lists, submodule instances  |
| `class-sequential-emitter.ts` | Emits always_ff blocks                                    |
| `class-emitter-base.ts`       | Expression translation (hex sizing, const substitution)   |
| `class-sv-helpers.ts`         | SV literal helpers (sizeLiteral, sanitize)                |
| `class-module-compiler.ts`    | Top-level entry: parser -> emitter                        |

## Type Mapping

```mermaid
graph LR
    TS_Bit["Bit"] --> SV_Logic1["logic"]
    TS_LogicN["Logic&lt;N&gt;"] --> SV_LogicN["logic [N-1:0]"]
    TS_Uint["Uint128 / UInt256"] --> SV_Wide["logic [W-1:0]"]
    TS_Enum["enum E { A, B }"] --> SV_Enum["typedef enum logic [...] E"]
```

## Board Constraint Generation

`BoardConstraintGen` reads a board JSON definition and emits vendor-specific
constraints. Gowin FPGAs get `.cst` files with `IO_LOC` and `IO_PORT`
directives. Xilinx FPGAs get `.xdc` files.

## Toolchain Flow (Gowin boards)

```mermaid
flowchart LR
    SV[".sv source"] --> Yosys["yosys synth_gowin -> JSON netlist"]
    Yosys --> Nextpnr["nextpnr-himbaechel -> placed JSON"]
    Nextpnr --> Pack["gowin_pack -> .fs bitstream"]
    Pack --> Flash["openFPGALoader --external-flash --write-flash --verify"]
```

All synthesis runs inside the `ts2v-gowin-oss` container image built from
`toolchain/Dockerfile`. No host installation of Yosys or nextpnr is required.

## Error Handling

All compiler errors carry a source location and a prefix code.

| Prefix    | Origin         |
| --------- | -------------- |
| TS2V-1000 | Lexer          |
| TS2V-2000 | Parser         |
| TS2V-3000 | Type checker   |
| TS2V-4000 | Code generator |

