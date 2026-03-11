// Verilog lint validation: proves generated output is structurally sound.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { CompilerPipeline } from '../packages/core/src/compiler/pipeline/compiler-pipeline';
import { lintVerilog, LintDiagnostic } from '../packages/core/src/compiler/lint/verilog-linter';

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const pipeline = new CompilerPipeline();

function loadExamples(): { name: string; source: string }[] {
  return fs.readdirSync(EXAMPLES_DIR)
    .filter(f => f.endsWith('.ts'))
    .map(f => ({ name: f, source: fs.readFileSync(path.join(EXAMPLES_DIR, f), 'utf-8') }));
}

describe('Verilog lint: zero errors on all generated output', () => {
  const examples = loadExamples();

  for (const { name, source } of examples) {
    it(`${name}: lints clean (no errors)`, () => {
      const result = pipeline.compile(source);
      assert.ok(result.success, `Compilation failed for ${name}`);
      const diagnostics = lintVerilog(result.verilog);
      const errors = diagnostics.filter(d => d.severity === 'error');
      assert.strictEqual(errors.length, 0,
        `${name} has lint errors:\n${errors.map(e => `  L${e.line_number} [${e.rule}]: ${e.message}`).join('\n')}`);
    });

    it(`${name}: lints clean (no warnings)`, () => {
      const result = pipeline.compile(source);
      assert.ok(result.success);
      const diagnostics = lintVerilog(result.verilog);
      const warnings = diagnostics.filter(d => d.severity === 'warning');
      assert.strictEqual(warnings.length, 0,
        `${name} has lint warnings:\n${warnings.map(w => `  L${w.line_number} [${w.rule}]: ${w.message}`).join('\n')}`);
    });
  }
});

describe('Verilog lint: linter catches real defects', () => {
  it('detects unclosed module', () => {
    const bad = '`timescale 1ns / 1ps\n`default_nettype none\nmodule broken (\n);\n`default_nettype wire';
    const diagnostics = lintVerilog(bad);
    assert.ok(diagnostics.some(d => d.rule === 'balanced-module' && d.severity === 'error'));
  });

  it('detects nested modules', () => {
    const bad = 'module outer ();\nmodule inner ();\nendmodule\nendmodule';
    const diagnostics = lintVerilog(bad);
    assert.ok(diagnostics.some(d => d.rule === 'no-nested-module'));
  });

  it('detects assign outside module', () => {
    const bad = 'assign x = 1;';
    const diagnostics = lintVerilog(bad);
    assert.ok(diagnostics.some(d => d.rule === 'assign-in-module'));
  });

  it('detects TypeScript leaks', () => {
    const bad = 'module test ();\nfunction foo() {}\nendmodule';
    const diagnostics = lintVerilog(bad);
    assert.ok(diagnostics.some(d => d.rule === 'no-typescript'));
  });

  it('detects missing timescale', () => {
    const bad = 'module test ();\nendmodule';
    const diagnostics = lintVerilog(bad);
    assert.ok(diagnostics.some(d => d.rule === 'timescale'));
  });

  it('detects missing default_nettype', () => {
    const bad = '`timescale 1ns / 1ps\nmodule test ();\nendmodule';
    const diagnostics = lintVerilog(bad);
    assert.ok(diagnostics.some(d => d.rule === 'default-nettype'));
  });

  it('detects multiply-driven nets', () => {
    const bad = 'module test ();\nassign result = 1;\nassign result = 2;\nendmodule';
    const diagnostics = lintVerilog(bad);
    assert.ok(diagnostics.some(d => d.rule === 'no-multi-driven'));
  });

  it('allows single-driven nets', () => {
    const good = 'module test ();\nassign result = 1;\nassign temp = 2;\nendmodule';
    const diagnostics = lintVerilog(good);
    assert.ok(!diagnostics.some(d => d.rule === 'no-multi-driven'));
  });
});
