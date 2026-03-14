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
    const sv = await compileToSv('examples/hardware/tang_nano_20k/blinker/blinker.ts');

    expect(sv.includes('module Blinker')).toBe(true);
    expect(sv.includes('logic [24:0] counter')).toBe(true);
    expect(sv.includes('logic [2:0] phase')).toBe(true);
    expect(sv.includes("led <= 6'h3e")).toBe(true);
    expect(sv.includes("led <= 6'h1f")).toBe(true);
  });

  test('ws2812 flagship demo compiles the multi-file directory to one SV with all three modules', async () => {
    const sv = await compileToSv('examples/hardware/tang_nano_20k/ws2812_demo');

    // All three modules must be present in the combined output
    expect(sv.includes('module Ws2812Serialiser')).toBe(true);
    expect(sv.includes('module RainbowGen')).toBe(true);
    expect(sv.includes('module Ws2812Demo')).toBe(true);

    // Serialiser: shift-register FSM state variables
    expect(sv.includes('shiftReg')).toBe(true);
    expect(sv.includes('bitCnt')).toBe(true);
    expect(sv.includes('timer')).toBe(true);

    // Protocol: correct reset and bit-period constants (inlined, not as localparams)
    expect(sv.includes('9999')).toBe(true); // TRESET_LAST = 10000 clocks
    expect(sv.includes('timer < 9')).toBe(true); // T0H = 9 clocks
    expect(sv.includes('timer < 19')).toBe(true); // T1H = 19 clocks
    expect(sv.includes('timer == 29')).toBe(true); // TBIT_LAST = 30 clocks
    expect(sv.includes('bitCnt == 23')).toBe(true); // 24 bits exactly

    // Shift-register bit extraction (inline, not via a stale register)
    expect(sv.includes('(shiftReg >> 23) & 1')).toBe(true);

    // Helper inlining and early-return eliminated: no unresolved calls in output
    expect(sv.includes('unresolved call')).toBe(false);

    // Rainbow generator: switch-case palette
    expect(sv.includes('case (step)')).toBe(true);
    expect(sv.includes('step')).toBe(true);
    expect(sv.includes('enable')).toBe(true);

    // Top-level LED walk state
    expect(sv.includes('walkTick')).toBe(true);
    expect(sv.includes('ledPhase')).toBe(true);

    // WS2812 serial output toggling
    expect(sv.includes("ws2812 <= 1'b1")).toBe(true);
    expect(sv.includes("ws2812 <= 1'b0")).toBe(true);
  });
});
