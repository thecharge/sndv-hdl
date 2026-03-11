import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Ts2vCompilationFacade } from './ts2v-compilation-facade';

describe('Hardware examples compile', () => {
  const facade = new Ts2vCompilationFacade();

  const examples = [
    'examples/hardware/tang_nano_20k_blinker.ts',
    'examples/hardware/usb_jtag_probe_blinker.ts',
    'examples/hardware/tang_nano_20k_reset_debug.ts',
    'examples/hardware/tang_nano_20k_uart_debug.ts',
    'examples/hardware/tang_nano_20k_ws2812b.ts',
  ];

  for (const examplePath of examples) {
    test(`compiles ${examplePath}`, async () => {
      const outputDirectoryPath = mkdtempSync(join(tmpdir(), 'ts2v-hw-example-'));
      const result = await facade.compile({
        inputPath: resolve(__dirname, '../../../../', examplePath),
        outputDirectoryPath,
      });

      expect(result.succeeded).toBe(true);
      expect(result.artifacts.some((artifact) => artifact.kind === 'systemverilog')).toBe(true);
      expect(result.artifacts.length).toBeGreaterThan(0);
    });
  }
});
