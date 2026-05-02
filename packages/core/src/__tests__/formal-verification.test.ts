import * as assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { compileClassModule } from '../compiler/class-compiler/class-module-compiler';
import { buildClassSource, buildFile } from '../compiler/compiler-engine';

const ASSERT_MODULE = `
@Assert(() => this.counter <= 15, 'counter_in_range')
@Module
@ModuleConfig('resetSignal: "no_rst"')
class Counter extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output counter: Logic<4> = 0;

    @Sequential('clk')
    tick(): void {
        this.counter = this.counter + 1;
    }
}
`;

const ASSUME_MODULE = `
@Assume(() => this.enable === 0 || this.enable === 1)
@Module
@ModuleConfig('resetSignal: "no_rst"')
class Gated extends HardwareModule {
    @Input  clk: Bit = 0;
    @Input  enable: Bit = 0;
    @Output out: Bit = 0;

    @Sequential('clk')
    tick(): void {
        if (this.enable === 1) {
            this.out = 1;
        }
    }
}
`;

const BOTH_MODULE = `
@Assert(() => this.x < 8)
@Assume(() => this.clk === 0 || this.clk === 1)
@Module
@ModuleConfig('resetSignal: "no_rst"')
class Both extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output x: Logic<3> = 0;

    @Sequential('clk')
    tick(): void {
        this.x = this.x + 1;
    }
}
`;

const NO_ASSERT_MODULE = `
@Module
@ModuleConfig('resetSignal: "no_rst"')
class Plain extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output out: Bit = 0;

    @Sequential('clk')
    tick(): void {
        this.out = 1;
    }
}
`;

describe('Formal verification - SVA codegen', () => {
  it('emits assert property from class-level @Assert with arrow function', () => {
    const result = compileClassModule(ASSERT_MODULE);
    assert.ok(result.success, `compilation failed: ${result.errors.join(', ')}`);
    assert.ok(
      result.systemverilog.includes('assert property'),
      'missing assert property in output',
    );
    assert.ok(
      result.systemverilog.includes('counter<=15'),
      'condition not present in assert property',
    );
    assert.ok(
      result.systemverilog.includes('$error("counter_in_range")'),
      'missing $error message',
    );
  });

  it('emits assume property from class-level @Assume with arrow function', () => {
    const result = compileClassModule(ASSUME_MODULE);
    assert.ok(result.success, `compilation failed: ${result.errors.join(', ')}`);
    assert.ok(
      result.systemverilog.includes('assume property'),
      'missing assume property in output',
    );
    assert.ok(
      result.systemverilog.includes('enable==0||enable==1'),
      'condition not present in assume property',
    );
  });

  it('emits both assert and assume when both decorators present', () => {
    const result = compileClassModule(BOTH_MODULE);
    assert.ok(result.success, `compilation failed: ${result.errors.join(', ')}`);
    assert.ok(result.systemverilog.includes('assert property'), 'missing assert property');
    assert.ok(result.systemverilog.includes('assume property'), 'missing assume property');
  });

  it('labels assert_N and assume_N distinctly', () => {
    const result = compileClassModule(BOTH_MODULE);
    assert.ok(result.success);
    assert.ok(result.systemverilog.includes('assert_0:'), 'missing assert_0 label');
    assert.ok(result.systemverilog.includes('assume_1:'), 'missing assume_1 label');
  });

  it('no assertion emits no SVA block', () => {
    const result = compileClassModule(NO_ASSERT_MODULE);
    assert.ok(result.success);
    assert.ok(!result.systemverilog.includes('assert property'), 'unexpected assert property');
    assert.ok(!result.systemverilog.includes('assume property'), 'unexpected assume property');
  });

  it('parses assertion from parsed AST', () => {
    const result = compileClassModule(ASSERT_MODULE);
    assert.ok(result.success && result.parsed);
    const mod = result.parsed.modules[0];
    assert.equal(mod.assertions.length, 1);
    assert.equal(mod.assertions[0].kind, 'assert');
    assert.equal(mod.assertions[0].message, 'counter_in_range');
    assert.ok(mod.assertions[0].condition.includes('counter'));
  });
});

describe('Formal verification - .sby generation', () => {
  const tmpDir = join(tmpdir(), `ts2v-sby-test-${Date.now()}`);

  function setup(): void {
    mkdirSync(tmpDir, { recursive: true });
  }

  function teardown(): void {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  it('buildClassSource writes .sby when assertions present', () => {
    setup();
    try {
      const result = buildClassSource(ASSERT_MODULE, 'counter', tmpDir);
      assert.ok(result.success, 'build failed');
      assert.ok(result.sbyPath, 'no sbyPath returned');
      // biome-ignore lint/style/noNonNullAssertion: guarded by assert above
      assert.ok(existsSync(result.sbyPath!), '.sby file not written to disk');
      // biome-ignore lint/style/noNonNullAssertion: guarded by assert above
      const sby = readFileSync(result.sbyPath!, 'utf-8');
      assert.ok(sby.includes('mode bmc'), 'missing mode bmc');
      assert.ok(sby.includes('depth 20'), 'missing depth 20');
      assert.ok(sby.includes('smtbmc'), 'missing smtbmc engine');
      assert.ok(sby.includes('prep -top Counter'), 'wrong top module');
      assert.ok(sby.includes('counter.sv'), 'sv file not referenced');
    } finally {
      teardown();
    }
  });

  it('buildClassSource does NOT write .sby when no assertions', () => {
    setup();
    try {
      const result = buildClassSource(NO_ASSERT_MODULE, 'plain', tmpDir);
      assert.ok(result.success, 'build failed');
      assert.equal(result.sbyPath, undefined, 'sbyPath should be undefined');
      assert.ok(!existsSync(join(tmpDir, 'plain.sby')), '.sby file should not exist');
    } finally {
      teardown();
    }
  });

  it('buildFile writes .sby for single-file class-mode design with assertions', () => {
    setup();
    try {
      const tsPath = join(tmpDir, 'counter.ts');
      writeFileSync(tsPath, ASSERT_MODULE);
      const result = buildFile(tsPath, tmpDir);
      assert.ok(result.success, 'build failed');
      assert.ok(result.sbyPath, 'no sbyPath returned');
      // biome-ignore lint/style/noNonNullAssertion: guarded by assert above
      assert.ok(existsSync(result.sbyPath!), '.sby file not on disk');
    } finally {
      teardown();
    }
  });

  it('buildFile does NOT write .sby for design without assertions', () => {
    setup();
    try {
      const tsPath = join(tmpDir, 'plain.ts');
      writeFileSync(tsPath, NO_ASSERT_MODULE);
      const result = buildFile(tsPath, tmpDir);
      assert.ok(result.success, 'build failed');
      assert.equal(result.sbyPath, undefined);
    } finally {
      teardown();
    }
  });
});
