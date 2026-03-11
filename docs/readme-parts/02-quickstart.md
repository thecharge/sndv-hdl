
## Quick Start

```bash
# Install
bun install

# Run all 370 tests
bun run test

# Compile a TypeScript hardware module to SystemVerilog
bun run apps/cli/src/index.ts compile cpu/ts/nibble4_core.ts --out cpu/build --board configs/tang_nano_9k.board.json

# Generate board constraints from board.json
bun run apps/cli/src/index.ts compile cpu/ts/nibble4_core.ts --out cpu/build --board configs/tang_nano_9k.board.json

# Run hardware testbenches (requires iverilog)
bash scripts/run-testbenches.sh
```
