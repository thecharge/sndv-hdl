# @ts2v/types

Shared TypeScript interfaces and type definitions for ts2v - the TypeScript-to-SystemVerilog compiler.

## Installation

```bash
npm install @ts2v/types
# or
bun add @ts2v/types
```

## Compiler Interfaces

### `CompileResult`

The result returned by a compile operation.

```typescript
import type { CompileResult } from '@ts2v/types';

function handleResult(result: CompileResult): void {
  if (!result.succeeded) {
    for (const diag of result.diagnostics) {
      if (diag.severity === 'error') {
        console.error(`[${diag.code}] ${diag.message}`);
        if (diag.location) {
          console.error(`  at ${diag.location.filePath}:${diag.location.line}`);
        }
      }
    }
    return;
  }
  for (const artifact of result.artifacts) {
    console.log(`Generated: ${artifact.filePath} (${artifact.lineCount} lines)`);
  }
}
```

### `CompileDiagnostic`

A structured diagnostic message emitted during compilation.

| Field | Type | Description |
|---|---|---|
| `severity` | `'error' \| 'warning' \| 'info'` | Severity level |
| `code` | `string` | Machine-readable code (e.g. `TS2V-2000`) |
| `message` | `string` | Human-readable message |
| `location` | `{ filePath?, line?, column? }` | Optional source location |

### `CompileArtifact`

A generated output file.

| Field | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the file |
| `lineCount` | `number` | Number of lines |
| `kind` | `'systemverilog' \| 'constraints' \| 'manifest'` | Artifact category |

## Testbench Spec Types

Types for writing UVM-style testbench specifications in TypeScript.

```typescript
import type { SeqTestSpec, CombTestSpec, TbSpec } from '@ts2v/types';

// Sequential (clocked) testbench spec
const spec: SeqTestSpec = {
  module: 'Blinker',
  clock: 'clk',
  reset: 'rst_n',
  resetActiveHigh: false,
  cases: [
    {
      description: 'LED walks after reset',
      inputs: [{ clk: 0, rst_n: 0 }, { clk: 1, rst_n: 1 }],
      expectedOutputs: [{ led: 0b000001 }],
    },
  ],
};

// Combinational testbench spec
const combSpec: CombTestSpec = {
  module: 'Adder',
  cases: [
    { inputs: { a: 1, b: 2 }, expectedOutputs: { sum: 3 } },
  ],
};
```

### `TbSpec`

Union type covering all testbench spec variants:

```typescript
type TbSpec = SeqTestSpec | CombTestSpec;
```

## License

MIT. See [LICENSE](../../LICENSE).
