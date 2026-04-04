import type { ContainerRuntime, ProcessCommand } from '@ts2v/types';
export declare class ContainerCommandFactory {
  createContainerCommand(options: {
    runtime: ContainerRuntime;
    image: string;
    workspacePath: string;
    workDirectory: string;
    shellCommand: string;
    devicePaths?: ReadonlyArray<string>;
  }): ProcessCommand;
}
