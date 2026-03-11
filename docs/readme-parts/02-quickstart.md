
## Quick Start

```bash
# Install
npm install

# Run all 370 tests
npm test

# Compile a TypeScript hardware module to SystemVerilog
npx ts-node src/cli.ts compile cpu/ts/nibble4_core.ts -o cpu/build/nibble4_core.sv

# Generate board constraints from board.json
npx ts-node src/cli.ts constraints boards/tang_nano_9k.board.json -o constraints/

# Run hardware testbenches (requires iverilog)
bash scripts/run-testbenches.sh
```
