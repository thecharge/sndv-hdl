export interface ProcessCommand {
  readonly executable: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
}

export interface ProcessExecutionResult {
  readonly exitCode: number;
  readonly standardOutput: string;
  readonly standardError: string;
}

export interface ProcessRunner {
  run(command: ProcessCommand): Promise<ProcessExecutionResult>;
}
