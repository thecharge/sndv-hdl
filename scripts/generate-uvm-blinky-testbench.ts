import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateBlinkyUvmLiteTestbench } from '../packages/core/src/compiler/verification/uvm-lite-blinky-testbench-generator';
import { blinkyUvmSpec } from '../testbenches/uvm/blinky.uvm-spec';

async function main(): Promise<void> {
  const outDir = join(process.cwd(), '.artifacts', 'uvm');
  await mkdir(outDir, { recursive: true });
  const bench = generateBlinkyUvmLiteTestbench(blinkyUvmSpec);
  const outPath = join(outDir, `${blinkyUvmSpec.testbenchModuleName}.sv`);
  await writeFile(outPath, bench, 'utf-8');
  console.log(`[artifact] uvm testbench: ${outPath}`);
}

void main();
