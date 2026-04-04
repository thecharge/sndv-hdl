import type { ProcessCommand, ProcessExecutionResult, ProcessRunner } from '@ts2v/types';
export declare class BunProcessRunner implements ProcessRunner {
  run(command: ProcessCommand): Promise<ProcessExecutionResult>;
}
