import { spawn } from 'node:child_process';
import type { ProcessCommand, ProcessExecutionResult, ProcessRunner } from '@ts2v/types';

export class BunProcessRunner implements ProcessRunner {
  async run(command: ProcessCommand): Promise<ProcessExecutionResult> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command.executable, [...command.args], {
        cwd: command.cwd,
        env: {
          ...process.env,
          ...(command.env ?? {}),
        },
      });

      let standardOutput = '';
      let standardError = '';

      childProcess.stdout.on('data', (chunk) => {
        standardOutput += chunk.toString();
      });

      childProcess.stderr.on('data', (chunk) => {
        standardError += chunk.toString();
      });

      childProcess.on('error', reject);
      childProcess.on('close', (exitCode) => {
        resolve({
          exitCode: exitCode ?? 1,
          standardOutput,
          standardError,
        });
      });
    });
  }
}
