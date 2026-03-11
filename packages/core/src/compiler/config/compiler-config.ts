// Compiler configuration with layered overlay support.
// Base config -> Board config -> User config (each layer merges on top).

import { DEFAULT_BIT_WIDTH, BOOLEAN_BIT_WIDTH } from '../constants/defaults';

export interface CompilerConfig {
  readonly project: ProjectConfig;
  readonly hardware: HardwareConfig;
  readonly output: OutputConfig;
}

export interface ProjectConfig {
  readonly name: string;
  readonly version: string;
}

export interface HardwareConfig {
  readonly default_bit_width: number;
  readonly boolean_bit_width: number;
  readonly timescale: string;
  readonly default_nettype: string;
}

export interface OutputConfig {
  readonly emit_header: boolean;
  readonly emit_timescale: boolean;
  readonly indent_style: 'spaces' | 'tabs';
  readonly indent_size: number;
}

// Sensible defaults for the base configuration layer.
export const BASE_CONFIG: CompilerConfig = {
  project: { name: 'untitled', version: '0.1.0' },
  hardware: {
    default_bit_width: DEFAULT_BIT_WIDTH,
    boolean_bit_width: BOOLEAN_BIT_WIDTH,
    timescale: '1ns / 1ps',
    default_nettype: 'none',
  },
  output: {
    emit_header: true,
    emit_timescale: true,
    indent_style: 'spaces',
    indent_size: 4,
  },
};

/**
 * Merge a partial config overlay on top of a base config.
 * Performs a shallow merge per section (project, hardware, output).
 * @param base - The base configuration.
 * @param overlay - Partial overrides to apply.
 * @returns Merged configuration.
 * @example
 *   const config = mergeConfig(BASE_CONFIG, { project: { name: 'my_alu' } });
 */
export function mergeConfig(base: CompilerConfig, overlay: Partial<DeepPartial<CompilerConfig>>): CompilerConfig {
  return {
    project: { ...base.project, ...overlay.project },
    hardware: { ...base.hardware, ...overlay.hardware },
    output: { ...base.output, ...overlay.output },
  };
}

// Allow deeply partial config for overlay files.
type DeepPartial<T> = { [P in keyof T]?: Partial<T[P]> };

/**
 * Parse a JSON string into a partial config overlay.
 * @param json_string - Raw JSON config content.
 * @returns Parsed partial config for merging.
 */
export function parseConfigOverlay(json_string: string): Partial<DeepPartial<CompilerConfig>> {
  return JSON.parse(json_string);
}
