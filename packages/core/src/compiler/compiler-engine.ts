import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { ClassModuleAST } from './class-compiler/class-module-ast';
import { compileClassModule } from './class-compiler/class-module-compiler';
import { VerilogEmitter } from './codegen/verilog-emitter';
import { CompilerError } from './errors/compiler-error';
import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { TypeChecker } from './typechecker/typechecker';

function buildSbyConfig(svPath: string, topModuleName: string): string {
    const svFile = basename(svPath);
    return [
        '[options]',
        'mode bmc',
        'depth 20',
        '',
        '[engines]',
        'smtbmc',
        '',
        '[script]',
        `read -formal ${svFile}`,
        `prep -top ${topModuleName}`,
        '',
        '[files]',
        svFile,
        '',
    ].join('\n');
}

function hasAssertions(modules: ClassModuleAST[]): boolean {
    return modules.some(m => m.assertions.length > 0);
}

function detectMode(source: string): 'class' | 'function' {
  const hasClass = source.includes('class ');
  const hasHardwareDecorators =
    source.includes('@Module') ||
    source.includes('@Sequential') ||
    source.includes('@Combinational') ||
    source.includes('extends Module');
  return hasClass && hasHardwareDecorators ? 'class' : 'function';
}

export function buildFile(
  inputPath: string,
  outDir: string,
): {
  success: boolean;
  outPath: string;
  lines: number;
  sbyPath?: string;
  compilerError?: CompilerError;
} {
  const source = readFileSync(inputPath, 'utf-8');
  const baseName = basename(inputPath, '.ts');
  const mode = detectMode(source);

  if (mode === 'class') {
    const classCompileResult = compileClassModule(source, inputPath);
    if (!classCompileResult.success) {
      return { success: false, outPath: '', lines: 0 };
    }

    const outputPath = join(outDir, `${baseName}.sv`);
    writeFileSync(outputPath, classCompileResult.systemverilog);

    let sbyPath: string | undefined;
    if (classCompileResult.parsed && hasAssertions(classCompileResult.parsed.modules)) {
      const topName = classCompileResult.parsed.modules[classCompileResult.parsed.modules.length - 1].name;
      const sbyContent = buildSbyConfig(outputPath, topName);
      sbyPath = join(outDir, `${baseName}.sby`);
      writeFileSync(sbyPath, sbyContent);
    }

    return {
      success: true,
      outPath: outputPath,
      lines: classCompileResult.systemverilog.split('\n').length,
      sbyPath,
    };
  }

  try {
    const tokens = new Lexer(source).tokenize();
    const ast = new Parser(tokens).parse();
    const checkedFunctions = new TypeChecker().check(ast);
    const verilog = new VerilogEmitter(checkedFunctions).emit(ast);
    const outputPath = join(outDir, `${baseName}.sv`);
    writeFileSync(outputPath, verilog);
    return { success: true, outPath: outputPath, lines: verilog.split('\n').length };
  } catch (error) {
    if (error instanceof CompilerError) {
      return { success: false, outPath: '', lines: 0, compilerError: error };
    }
    return { success: false, outPath: '', lines: 0 };
  }
}

// Compile a pre-assembled multi-file source string as one class-mode unit.
// outName is used as the .sv output basename (no extension).
export function buildClassSource(
  source: string,
  outName: string,
  outDir: string,
): {
  success: boolean;
  outPath: string;
  lines: number;
  sbyPath?: string;
  clockDomains?: { name: string; freq?: number; pin?: string }[];
} {
  const classCompileResult = compileClassModule(source);
  if (!classCompileResult.success) {
    return { success: false, outPath: '', lines: 0 };
  }
  const outputPath = join(outDir, `${outName}.sv`);
  writeFileSync(outputPath, classCompileResult.systemverilog);

  // Collect all unique clock domains from the parsed modules.
  const clockDomains: { name: string; freq?: number; pin?: string }[] = [];
  let sbyPath: string | undefined;

  if (classCompileResult.parsed) {
    const seen = new Set<string>();
    for (const mod of classCompileResult.parsed.modules) {
      for (const clk of mod.clocks ?? []) {
        if (!seen.has(clk.name)) {
          seen.add(clk.name);
          clockDomains.push(clk);
        }
      }
    }

    if (hasAssertions(classCompileResult.parsed.modules)) {
      const topName = classCompileResult.parsed.modules[classCompileResult.parsed.modules.length - 1].name;
      const sbyContent = buildSbyConfig(outputPath, topName);
      sbyPath = join(outDir, `${outName}.sby`);
      writeFileSync(sbyPath, sbyContent);
    }
  }

  return {
    success: true,
    outPath: outputPath,
    lines: classCompileResult.systemverilog.split('\n').length,
    sbyPath,
    clockDomains,
  };
}

/** @deprecated Use `generateBoardConstraints` from `packages/core/src/compiler/constraints/generate-board-constraints.ts` instead. */
export function generateConstraints(boardJsonPath: string, outDir: string): string {
  const raw = JSON.parse(readFileSync(boardJsonPath, 'utf-8')) as Record<string, unknown>;
  const board = (raw.board as Record<string, unknown> | undefined) ?? raw;
  const vendor = String(board.vendor ?? raw.vendor ?? '').toLowerCase();
  const lines: string[] = [];
  let extension = '.cst';

  const pins: Record<
    string,
    { pin: string; std: string; freq?: string; drive?: string; pull?: string }
  > = {};
  const boardPins = board.pins as Record<string, string> | undefined;
  if (boardPins) {
    const ioStandard = String(board.io_standard ?? 'LVCMOS33');
    for (const [name, pin] of Object.entries(boardPins)) {
      const freq = name.includes('clk')
        ? `${String(board.clock_frequency_in_mhz ?? (raw.hardware as Record<string, unknown> | undefined)?.clock_frequency_in_mhz ?? 27)}MHz`
        : undefined;
      pins[name] = { pin: String(pin), std: ioStandard, freq };
    }
  }

  const boardClocks = board.clocks as Record<
    string,
    { pin: string; std?: string; freq?: string }
  > | null;
  if (boardClocks) {
    for (const [name, config] of Object.entries(boardClocks)) {
      pins[name] = { pin: config.pin, std: config.std ?? 'LVCMOS33', freq: config.freq };
    }
  }

  const boardIo = board.io as Record<
    string,
    { pin: string; std?: string; drive?: string; pull?: string }
  > | null;
  if (boardIo) {
    for (const [name, config] of Object.entries(boardIo)) {
      pins[name] = {
        pin: config.pin,
        std: config.std ?? 'LVCMOS33',
        drive: config.drive,
        pull: config.pull,
      };
    }
  }

  const family = String(board.family ?? board.part ?? 'unknown');
  const part = String(board.part ?? 'unknown');

  if (vendor === 'gowin' || vendor === 'sipeed' || vendor === 'tang') {
    extension = '.cst';
    lines.push(`// Generated by ts2v from ${basename(boardJsonPath)}`);
    lines.push(`// Target: ${family} (${part})`);
    lines.push('');
    for (const [name, config] of Object.entries(pins)) {
      lines.push(`IO_LOC "${name}" ${config.pin};`);
      let attrs = `IO_TYPE=${config.std}`;
      if (config.drive) attrs += ` DRIVE=${config.drive}`;
      if (config.pull) attrs += ` PULL_MODE=${config.pull}`;
      lines.push(`IO_PORT "${name}" ${attrs};`);
    }
  } else if (vendor === 'xilinx') {
    extension = '.xdc';
    lines.push(`## Generated by ts2v from ${basename(boardJsonPath)}`);
    lines.push(`## Target: ${family} (${part})`);
    lines.push('');
    for (const [name, config] of Object.entries(pins)) {
      lines.push(`set_property PACKAGE_PIN ${config.pin} [get_ports ${name}]`);
      lines.push(`set_property IOSTANDARD ${config.std} [get_ports ${name}]`);
      if (config.freq) {
        const frequencyMhz = Number.parseFloat(config.freq.replace(/[A-Za-z]/g, ''));
        const period = 1000 / frequencyMhz;
        lines.push(`create_clock -period ${period.toFixed(3)} -name ${name} [get_ports ${name}]`);
      }
    }
  } else if (vendor === 'intel' || vendor === 'altera') {
    extension = '.qsf';
    lines.push(`# Generated by ts2v from ${basename(boardJsonPath)}`);
    lines.push('');
    for (const [name, config] of Object.entries(pins)) {
      lines.push(`set_location_assignment PIN_${config.pin} -to ${name}`);
      lines.push(`set_instance_assignment -name IO_STANDARD "3.3-V LVCMOS" -to ${name}`);
    }
  } else if (vendor === 'lattice') {
    extension = '.lpf';
    lines.push(`# Generated by ts2v from ${basename(boardJsonPath)}`);
    lines.push('');
    for (const [name, config] of Object.entries(pins)) {
      lines.push(`LOCATE COMP "${name}" SITE "${config.pin}";`);
      lines.push(`IOBUF PORT "${name}" IO_TYPE=${config.std};`);
      if (config.freq) {
        const frequencyMhz = Number.parseFloat(config.freq.replace(/[A-Za-z]/g, ''));
        lines.push(`FREQUENCY PORT "${name}" ${frequencyMhz} MHz;`);
      }
    }
  }

  const outputPath = join(
    outDir,
    basename(boardJsonPath).replace('.board.json', extension).replace('.json', extension),
  );
  writeFileSync(outputPath, lines.join('\n'));
  return outputPath;
}
