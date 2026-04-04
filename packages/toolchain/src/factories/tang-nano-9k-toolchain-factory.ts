import { WorkspaceConfigurationRepository, WorkspaceConfigurationService } from '@ts2v/config';
import { BunProcessRunner, RuntimeDetectionRepository } from '@ts2v/process';
import { SupportedBoardId, type ToolchainAdapter } from '@ts2v/types';
import { TangNano9kToolchainAdapter } from '../adapters/tang-nano-9k-toolchain-adapter';
import { ContainerRuntimeRepository } from '../repositories/container-runtime-repository';
import { ContainerCommandFactory } from './container-command-factory';

export class TangNano9kToolchainFactory {
  async create(): Promise<ToolchainAdapter> {
    const workspaceConfigurationService = new WorkspaceConfigurationService(
      new WorkspaceConfigurationRepository(),
    );
    const workspaceConfiguration = workspaceConfigurationService.getWorkspaceConfiguration();
    const boardConfiguration = workspaceConfigurationService.getBoardConfiguration(
      SupportedBoardId.TangNano9k,
    );

    const runtimeDetectionRepository = new RuntimeDetectionRepository();
    const containerRuntimeRepository = new ContainerRuntimeRepository(runtimeDetectionRepository);
    const containerRuntime = await containerRuntimeRepository.resolveRuntime(
      workspaceConfiguration.container.runtimePriority,
    );

    return new TangNano9kToolchainAdapter(
      new BunProcessRunner(),
      new ContainerCommandFactory(),
      workspaceConfiguration,
      boardConfiguration,
      containerRuntime,
    );
  }
}
