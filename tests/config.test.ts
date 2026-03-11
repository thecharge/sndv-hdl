// Unit tests for compiler configuration.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BASE_CONFIG, mergeConfig, parseConfigOverlay } from '../src/config/compiler-config';

describe('CompilerConfig', () => {
  describe('BASE_CONFIG defaults', () => {
    it('has default bit width of 32', () => {
      assert.strictEqual(BASE_CONFIG.hardware.default_bit_width, 32);
    });

    it('has boolean bit width of 1', () => {
      assert.strictEqual(BASE_CONFIG.hardware.boolean_bit_width, 1);
    });

    it('has default timescale', () => {
      assert.strictEqual(BASE_CONFIG.hardware.timescale, '1ns / 1ps');
    });
  });

  describe('mergeConfig', () => {
    it('preserves base when overlay is empty', () => {
      const merged = mergeConfig(BASE_CONFIG, {});
      assert.deepStrictEqual(merged, BASE_CONFIG);
    });

    it('overrides project name', () => {
      const merged = mergeConfig(BASE_CONFIG, { project: { name: 'my_alu' } });
      assert.strictEqual(merged.project.name, 'my_alu');
      assert.strictEqual(merged.project.version, BASE_CONFIG.project.version);
    });

    it('overrides hardware settings', () => {
      const merged = mergeConfig(BASE_CONFIG, { hardware: { default_bit_width: 16 } });
      assert.strictEqual(merged.hardware.default_bit_width, 16);
      assert.strictEqual(merged.hardware.timescale, BASE_CONFIG.hardware.timescale);
    });
  });

  describe('parseConfigOverlay', () => {
    it('parses valid JSON', () => {
      const overlay = parseConfigOverlay('{"project":{"name":"test"}}');
      assert.strictEqual((overlay as any).project.name, 'test');
    });

    it('throws on invalid JSON', () => {
      assert.throws(() => parseConfigOverlay('not json'));
    });
  });
});
