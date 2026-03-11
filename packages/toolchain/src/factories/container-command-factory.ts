import type { ContainerRuntime, ProcessCommand } from '@ts2v/types';

export class ContainerCommandFactory {
  createContainerCommand(options: {
    runtime: ContainerRuntime;
    image: string;
    workspacePath: string;
    workDirectory: string;
    shellCommand: string;
    devicePaths?: ReadonlyArray<string>;
  }): ProcessCommand {
    const { runtime, image, workspacePath, workDirectory, shellCommand } = options;
    const deviceArguments = (options.devicePaths ?? []).flatMap((devicePath) => [
      '--device',
      devicePath,
    ]);

    return {
      executable: runtime,
      args: [
        'run',
        '--rm',
        '-v',
        `${workspacePath}:${workDirectory}`,
        '-w',
        workDirectory,
        ...deviceArguments,
        image,
        'bash',
        '-lc',
        shellCommand,
      ],
    };
  }
}
