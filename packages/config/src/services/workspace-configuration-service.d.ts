import type { BoardConfiguration, SupportedBoardId, WorkspaceConfiguration } from '@ts2v/types';
import type { WorkspaceConfigurationRepository } from '../repositories/workspace-configuration-repository';
export declare class WorkspaceConfigurationService {
  private readonly repository;
  constructor(repository: WorkspaceConfigurationRepository);
  getWorkspaceConfiguration(configPath?: string): WorkspaceConfiguration;
  getBoardConfiguration(boardId: SupportedBoardId, configPath?: string): BoardConfiguration;
}
