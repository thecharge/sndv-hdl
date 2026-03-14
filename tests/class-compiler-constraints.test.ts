import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { generateConstraints, BoardDefinition } from '../packages/core/src/compiler/constraints/board-constraint-gen';

describe('BoardConstraintGenerator', () => {

  it('generates Gowin .cst from board.json', () => {
    const board: BoardDefinition = {
      vendor: 'gowin', family: 'GW1NR-9C', part: 'GW1NR-LV9QN88PC6/I5',
      clocks: { clk: { pin: '52', freq: '27MHz', std: 'LVCMOS33' } },
      io: { 'led[0]': { pin: '10', std: 'LVCMOS33' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.cst'));
    assert.ok(result.content.includes('IO_LOC  "clk" 52'));
    assert.ok(result.content.includes('IO_TYPE=LVCMOS33'));
    assert.ok(result.content.includes('IO_LOC  "led[0]" 10'));
  });

  it('generates Xilinx .xdc with create_clock', () => {
    const board: BoardDefinition = {
      vendor: 'xilinx', family: 'artix7', part: 'xc7a35t',
      clocks: { sys_clk: { pin: 'E3', freq: '100MHz', std: 'LVCMOS33' } },
      io: { uart_tx: { pin: 'D10', std: 'LVCMOS33' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.xdc'));
    assert.ok(result.content.includes('set_property PACKAGE_PIN E3'));
    assert.ok(result.content.includes('create_clock -period 10.000'));
    assert.ok(result.content.includes('set_property PACKAGE_PIN D10'));
  });

  it('emits Xilinx drive and pull properties when present', () => {
    const board: BoardDefinition = {
      vendor: 'xilinx', family: 'artix7', part: 'xc7a35t',
      clocks: { sys_clk: { pin: 'E3', freq: '100MHz', std: 'LVCMOS33' } },
      io: {
        led: { pin: 'D10', std: 'LVCMOS33', drive: '8', pull: 'UP' }
      }
    };
    const result = generateConstraints(board);
    assert.ok(result.content.includes('set_property DRIVE 8 [get_ports led]'));
    assert.ok(result.content.includes('set_property PULLTYPE UP [get_ports led]'));
  });

  it('generates Intel .qsf', () => {
    const board: BoardDefinition = {
      vendor: 'intel', family: 'cyclone10', part: '10CL025YU256C8G',
      clocks: { clk: { pin: 'M2', freq: '50MHz', std: '3.3-V LVCMOS' } },
      io: { led: { pin: 'U7', std: '3.3-V LVCMOS' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.qsf'));
    assert.ok(result.content.includes('set_location_assignment PIN_M2'));
    assert.ok(result.content.includes('set_global_assignment -name DEVICE'));
  });

  it('generates Lattice .lpf', () => {
    const board: BoardDefinition = {
      vendor: 'lattice', family: 'ecp5', part: 'LFE5U-85F',
      clocks: { clk: { pin: 'P3', freq: '25MHz', std: 'LVCMOS33' } },
      io: { led: { pin: 'B2', std: 'LVCMOS33' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.lpf'));
    assert.ok(result.content.includes('LOCATE COMP "clk" SITE "P3"'));
    assert.ok(result.content.includes('FREQUENCY PORT "clk" 25 MHz'));
  });

  it('emits Gowin drive and pull properties when present', () => {
    const board: BoardDefinition = {
      vendor: 'gowin', family: 'GW1NR-9C', part: 'GW1NR-LV9QN88PC6/I5',
      clocks: { clk: { pin: '52', freq: '27MHz', std: 'LVCMOS33' } },
      io: {
        led: { pin: '10', std: 'LVCMOS33', drive: '8', pull: 'UP' }
      }
    };
    const result = generateConstraints(board);
    assert.ok(result.content.includes('IO_PORT "led" IO_TYPE=LVCMOS33 DRIVE=8 PULL_MODE=UP;'));
  });
});
describe('BoardConstraintGenerator', () => {

  it('generates Gowin .cst from board.json', () => {
    const board: BoardDefinition = {
      vendor: 'gowin', family: 'GW1NR-9C', part: 'GW1NR-LV9QN88PC6/I5',
      clocks: { clk: { pin: '52', freq: '27MHz', std: 'LVCMOS33' } },
      io: { 'led[0]': { pin: '10', std: 'LVCMOS33' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.cst'));
    assert.ok(result.content.includes('IO_LOC  "clk" 52'));
    assert.ok(result.content.includes('IO_TYPE=LVCMOS33'));
    assert.ok(result.content.includes('IO_LOC  "led[0]" 10'));
  });

  it('generates Xilinx .xdc with create_clock', () => {
    const board: BoardDefinition = {
      vendor: 'xilinx', family: 'artix7', part: 'xc7a35t',
      clocks: { sys_clk: { pin: 'E3', freq: '100MHz', std: 'LVCMOS33' } },
      io: { uart_tx: { pin: 'D10', std: 'LVCMOS33' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.xdc'));
    assert.ok(result.content.includes('set_property PACKAGE_PIN E3'));
    assert.ok(result.content.includes('create_clock -period 10.000'));
    assert.ok(result.content.includes('set_property PACKAGE_PIN D10'));
  });

  it('emits Xilinx drive and pull properties when present', () => {
    const board: BoardDefinition = {
      vendor: 'xilinx', family: 'artix7', part: 'xc7a35t',
      clocks: { sys_clk: { pin: 'E3', freq: '100MHz', std: 'LVCMOS33' } },
      io: {
        led: { pin: 'D10', std: 'LVCMOS33', drive: '8', pull: 'UP' }
      }
    };
    const result = generateConstraints(board);
    assert.ok(result.content.includes('set_property DRIVE 8 [get_ports led]'));
    assert.ok(result.content.includes('set_property PULLTYPE UP [get_ports led]'));
  });

  it('generates Intel .qsf', () => {
    const board: BoardDefinition = {
      vendor: 'intel', family: 'cyclone10', part: '10CL025YU256C8G',
      clocks: { clk: { pin: 'M2', freq: '50MHz', std: '3.3-V LVCMOS' } },
      io: { led: { pin: 'U7', std: '3.3-V LVCMOS' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.qsf'));
    assert.ok(result.content.includes('set_location_assignment PIN_M2'));
    assert.ok(result.content.includes('set_global_assignment -name DEVICE'));
  });

  it('generates Lattice .lpf', () => {
    const board: BoardDefinition = {
      vendor: 'lattice', family: 'ecp5', part: 'LFE5U-85F',
      clocks: { clk: { pin: 'P3', freq: '25MHz', std: 'LVCMOS33' } },
      io: { led: { pin: 'B2', std: 'LVCMOS33' } }
    };
    const result = generateConstraints(board);
    assert.ok(result.filename.endsWith('.lpf'));
    assert.ok(result.content.includes('LOCATE COMP "clk" SITE "P3"'));
    assert.ok(result.content.includes('FREQUENCY PORT "clk" 25 MHz'));
  });

  it('emits Gowin drive and pull properties when present', () => {
    const board: BoardDefinition = {
      vendor: 'gowin', family: 'GW1NR-9C', part: 'GW1NR-LV9QN88PC6/I5',
      clocks: { clk: { pin: '52', freq: '27MHz', std: 'LVCMOS33' } },
      io: {
        led: { pin: '10', std: 'LVCMOS33', drive: '8', pull: 'UP' }
      }
    };
    const result = generateConstraints(board);
    assert.ok(result.content.includes('IO_PORT "led" IO_TYPE=LVCMOS33 DRIVE=8 PULL_MODE=UP;'));
  });
});
