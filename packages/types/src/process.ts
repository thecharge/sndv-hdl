/** A command to execute as an external process. */
export interface ProcessCommand {
  /** Executable name or absolute path. */
  readonly executable: string;
  /** Arguments passed to the executable. */
  readonly args: ReadonlyArray<string>;
  /** Working directory for the process. Defaults to the current directory if omitted. */
  readonly cwd?: string;
  /** Environment variables to set for the process. */
  readonly env?: Readonly<Record<string, string>>;
}

/** The outcome of running an external process to completion. */
export interface ProcessExecutionResult {
  /** Exit code returned by the process (0 = success). */
  readonly exitCode: number;
  /** Full stdout output captured from the process. */
  readonly standardOutput: string;
  /** Full stderr output captured from the process. */
  readonly standardError: string;
}

/** Abstraction for executing external processes, enabling test doubles in unit tests. */
export interface ProcessRunner {
  run(command: ProcessCommand): Promise<ProcessExecutionResult>;
}
