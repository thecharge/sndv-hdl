import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface UvmRunReport {
  suite: string;
  generatedAt: string;
  status: 'pass' | 'fail';
  passCount: number;
  failCount: number;
  checkedCases: string[];
  infoLines: string[];
  errorLines: string[];
  logPath: string;
}

function parseReport(logText: string, logPath: string, suite: string): UvmRunReport {
  const lines = logText.split(/\r?\n/).filter(Boolean);
  const checkedCases = lines
    .filter(line => /\[UVM_INFO\]\[[^\]]*TEST\]\s+checked\s+/i.test(line))
    .map(line => {
      const match = line.match(/checked\s+(.+)$/i);
      return match?.[1]?.trim() ?? '';
    })
    .filter(Boolean);

  const scoreLine = lines.find(line => /uvm-lite\s+testbench:\s+\d+\s+passed,\s+\d+\s+failed/i.test(line)) ?? '';
  const scoreMatch = scoreLine.match(/testbench:\s+(\d+)\s+passed,\s+(\d+)\s+failed/i);
  const passCount = scoreMatch ? Number.parseInt(scoreMatch[1], 10) : 0;
  const failCount = scoreMatch ? Number.parseInt(scoreMatch[2], 10) : 0;
  const errorLines = lines.filter(line => line.includes('[UVM_ERROR]') || line.includes('[UVM_FATAL]'));
  const infoLines = lines.filter(line => line.includes('[UVM_INFO]'));
  const hasStructuralEvidence = Boolean(scoreMatch) && checkedCases.length > 0;
  const status: 'pass' | 'fail' = failCount === 0 && errorLines.length === 0 && hasStructuralEvidence
    ? 'pass'
    : 'fail';

  return {
    suite,
    generatedAt: new Date().toISOString(),
    status,
    passCount,
    failCount,
    checkedCases,
    infoLines,
    errorLines,
    logPath,
  };
}

function toMarkdown(report: UvmRunReport): string {
  const caseRows = report.checkedCases.length > 0
    ? report.checkedCases.map(name => `- ${name}`).join('\n')
    : '- none';

  return [
    '# UVM Simulation Report',
    '',
    `- Suite: ${report.suite}`,
    `- Generated: ${report.generatedAt}`,
    `- Status: ${report.status.toUpperCase()}`,
    `- Passed checks: ${report.passCount}`,
    `- Failed checks: ${report.failCount}`,
    `- Log: ${report.logPath}`,
    '',
    '## Checked Cases',
    caseRows,
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const logPath = process.argv[2];
  const suite = process.argv[3] ?? 'default';
  if (!logPath) {
    throw new Error('Usage: bun run scripts/generate-uvm-report.ts <log-file> [suite-name]');
  }

  const outDir = join(process.cwd(), '.artifacts', 'uvm', 'reports');
  await mkdir(outDir, { recursive: true });

  const logText = await readFile(logPath, 'utf-8');
  const report = parseReport(logText, logPath, suite);

  const jsonPath = join(outDir, `uvm-${suite}-report.json`);
  const mdPath = join(outDir, `uvm-${suite}-report.md`);
  await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  await writeFile(mdPath, toMarkdown(report), 'utf-8');

  console.log(`[artifact] uvm report json: ${jsonPath}`);
  console.log(`[artifact] uvm report md: ${mdPath}`);

  if (report.status !== 'pass') {
    throw new Error(`UVM suite ${suite} failed (${report.failCount} failed checks).`);
  }
}

void main();
