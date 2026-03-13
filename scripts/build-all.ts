#!/usr/bin/env node
// Build pipeline: compile all examples to Verilog output.
// Usage: node --require ts-node/register scripts/build-all.ts

import * as fs from 'fs';
import * as path from 'path';
import { CompilerPipeline } from '../packages/core/src/compiler/pipeline/compiler-pipeline';

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const BUILD_DIR = path.join(__dirname, '..', 'build');

interface BuildResult {
  readonly source_path: string;
  readonly output_path: string;
  readonly module_count: number;
  readonly success: boolean;
  readonly error_message: string;
}

/** Recursively collect all .ts files from a directory tree, excluding tb_*.sv files. */
async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

async function buildAll(): Promise<void> {
  await fs.promises.mkdir(BUILD_DIR, { recursive: true });
  const pipeline = new CompilerPipeline();
  const all_files = await collectTsFiles(EXAMPLES_DIR);
  // Only build combinational examples (hardware/ examples use the CLI path)
  const ts_files = all_files
    .filter(f => !f.includes(`${path.sep}hardware${path.sep}`))
    .map(f => path.relative(path.join(__dirname, '..', 'examples'), f));

  console.log(`ts2v build: ${ts_files.length} source files\n`);

  const results: BuildResult[] = [];
  let total_modules = 0;
  let failed_count = 0;

  for (const file of ts_files) {
    const source_path = path.join(EXAMPLES_DIR, file);
    const flat_name = file.replace(/[/\\]/g, '_').replace(/\.ts$/, '');
    const output_name = flat_name + '.v';
    const output_path = path.join(BUILD_DIR, output_name);

    const source = await fs.promises.readFile(source_path, 'utf-8');
    const result = pipeline.compile(source);

    if (result.success) {
      await fs.promises.writeFile(output_path, result.verilog, 'utf-8');
      const module_count = (result.verilog.match(/^module /gm) || []).length;
      total_modules += module_count;
      results.push({ source_path: file, output_path: output_name, module_count, success: true, error_message: '' });
      console.log(`  OK  ${file} -> ${output_name} (${module_count} modules)`);
    } else {
      failed_count++;
      const error_message = result.errors.map(e => e.message).join('; ');
      results.push({ source_path: file, output_path: output_name, module_count: 0, success: false, error_message });
      console.log(`  FAIL  ${file}: ${error_message}`);
    }
  }

  // Generate file list (sim.f) in dependency order
  const sim_f_lines = results.filter(r => r.success).map(r => r.output_path);
  await fs.promises.writeFile(path.join(BUILD_DIR, 'sim.f'), sim_f_lines.join('\n') + '\n', 'utf-8');

  console.log(`\nBuild complete: ${results.length - failed_count}/${results.length} files, ${total_modules} modules`);
  if (failed_count > 0) {
    console.error(`${failed_count} file(s) failed.`);
    process.exit(1);
  }
}

buildAll();
