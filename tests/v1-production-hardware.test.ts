import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { compileClassModule } from '../packages/core/src/compiler/class-compiler/class-module-compiler';
import * as fs from 'fs';
import * as path from 'path';
describe('v1.0.0 production: Tang Nano 20K end-to-end', () => {
  it('tang_nano_20k/blinker compiles from valid TypeScript', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'examples', 'hardware', 'tang_nano_20k', 'blinker', 'blinker.ts'),
      'utf-8',
    );
    const result = compileClassModule(source);
    assert.ok(result.success, `Compilation failed: ${result.errors.join(', ')}`);
    assert.ok(result.systemverilog.includes('module Blinker ('), 'Blinker module');
    assert.ok(result.systemverilog.includes('always_ff'), 'sequential logic');
  });

  it('tang_nano_20k/breathe compiles with submodule instantiation', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'examples', 'hardware', 'tang_nano_20k', 'breathe', 'breathe.ts'),
      'utf-8',
    );
    const result = compileClassModule(source);
    assert.ok(result.success, `Compilation failed: ${result.errors.join(', ')}`);
    assert.ok(result.systemverilog.includes('module PwmCore ('), 'PwmCore module');
    assert.ok(result.systemverilog.includes('module BreatheLed ('), 'BreatheLed module');
    assert.ok(result.systemverilog.includes('PwmCore pwm_core ('), 'submodule inst');
    assert.ok(result.systemverilog.includes('.clk(clk)'), 'clk port');
  });

  it('tang_nano_20k/counter compiles from valid TypeScript', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'examples', 'hardware', 'tang_nano_20k', 'counter', 'counter.ts'),
      'utf-8',
    );
    const result = compileClassModule(source);
    assert.ok(result.success, `Compilation failed: ${result.errors.join(', ')}`);
    assert.ok(result.systemverilog.includes('module Counter ('), 'Counter module');
    assert.ok(result.systemverilog.includes("count <= 8'd0"), 'reset value');
  });
});

describe('v1.0.0 production: board constraint generation', () => {
  it('tang_nano_20k.board.json generates valid Gowin .cst', () => {
    const { generateConstraints } = require('../packages/core/src/compiler/constraints/board-constraint-gen');
    const boardJson = fs.readFileSync(
      path.join(__dirname, '..', 'boards', 'tang_nano_20k.board.json'),
      'utf-8',
    );
    const board = JSON.parse(boardJson);
    const cst = generateConstraints(board);
    assert.ok(cst.content.includes('IO_LOC'), 'IO_LOC present');
    assert.ok(cst.content.includes('IO_PORT'), 'IO_PORT present');
    assert.ok(cst.content.includes('"clk" 4'), 'clk pin');
    assert.ok(cst.content.includes('LVCMOS33'), 'voltage standard');
    assert.ok(cst.content.includes('GW2AR-18C'), 'device name');
  });
});
