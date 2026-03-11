import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Ts2vCompilationFacade } from './ts2v-compilation-facade';

describe('Hardware examples behavior', () => {
  const facade = new Ts2vCompilationFacade();

  async function compileToSv(examplePath: string): Promise<string> {
    const outputDirectoryPath = mkdtempSync(join(tmpdir(), 'ts2v-hw-behavior-'));
    const result = await facade.compile({
      inputPath: resolve(__dirname, '../../../../', examplePath),
      outputDirectoryPath,
    });

    expect(result.succeeded).toBe(true);
    const systemVerilogArtifact = result.artifacts.find(
      (artifact) => artifact.kind === 'systemverilog',
    );
    expect(systemVerilogArtifact).toBeDefined();
    if (!systemVerilogArtifact) {
      throw new Error('SystemVerilog artifact missing');
    }

    return readFileSync(systemVerilogArtifact.filePath, 'utf8');
  }

  test('blinker emits deterministic phase pattern updates', async () => {
    const sv = await compileToSv('examples/hardware/tang_nano_20k_blinker.ts');

    expect(sv.includes('module Blinker')).toBe(true);
    expect(sv.includes('logic [24:0] counter')).toBe(true);
    expect(sv.includes('logic [2:0] phase')).toBe(true);
    expect(sv.includes("led <= 8'h3e")).toBe(true);
    expect(sv.includes("led <= 8'h1f")).toBe(true);
  });

  test('ws2812 demo emits timing-controlled serial driver', async () => {
    const sv = await compileToSv('examples/hardware/tang_nano_20k_ws2812b.ts');

    expect(sv.includes('module Ws2812bDemo')).toBe(true);
    expect(sv.includes('t1h')).toBe(true);
    expect(sv.includes('t0h')).toBe(true);
    expect(sv.includes('tbit')).toBe(true);
    expect(sv.includes('treset')).toBe(true);
    expect(sv.includes("ws2812 <= 1'b1")).toBe(true);
    expect(sv.includes("ws2812 <= 1'b0")).toBe(true);
  });
});
