import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Ts2vCompilationFacade } from './ts2v-compilation-facade';

describe('Ts2vCompilationFacade', () => {
  test('compiles a function mode file and emits artifacts', async () => {
    const outputDirectoryPath = mkdtempSync(join(tmpdir(), 'ts2v-test-'));
    const facade = new Ts2vCompilationFacade();

    const result = await facade.compile({
      inputPath: resolve(__dirname, '../../../../examples/adder/adder.ts'),
      outputDirectoryPath,
    });

    expect(result.succeeded).toBe(true);
    expect(result.artifacts.some((artifact) => artifact.kind === 'systemverilog')).toBe(true);
    expect(result.artifacts.some((artifact) => artifact.kind === 'manifest')).toBe(true);
  });
});
