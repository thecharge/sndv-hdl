import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateUvmLiteTestbench } from '../packages/core/src/compiler/verification/uvm-lite-testbench-generator';
import { aluUvmSpec } from '../testbenches/uvm/alu.uvm-spec';

async function main(): Promise<void> {
  const outDir = join(process.cwd(), '.artifacts', 'uvm');
  await mkdir(outDir, { recursive: true });
  const bench = generateUvmLiteTestbench(aluUvmSpec);
  const outPath = join(outDir, `${aluUvmSpec.testbenchModuleName}.sv`);
  await writeFile(outPath, bench, 'utf-8');
  console.log(`[artifact] uvm testbench: ${outPath}`);
}

void main();
