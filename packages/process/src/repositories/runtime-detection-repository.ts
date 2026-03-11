import { BunProcessRunner } from '../runners/bun-process-runner';

export class RuntimeDetectionRepository {
  private readonly processRunner = new BunProcessRunner();

  async hasCommand(executableName: string): Promise<boolean> {
    const result = await this.processRunner.run({
      executable: 'bash',
      args: ['-lc', `command -v ${executableName}`],
    });
    return result.exitCode === 0;
  }
}
