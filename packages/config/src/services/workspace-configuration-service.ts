import type { BoardConfiguration, SupportedBoardId, WorkspaceConfiguration } from '@ts2v/types';
import type { WorkspaceConfigurationRepository } from '../repositories/workspace-configuration-repository';

export class WorkspaceConfigurationService {
  constructor(private readonly repository: WorkspaceConfigurationRepository) {}

  getWorkspaceConfiguration(configPath?: string): WorkspaceConfiguration {
    return this.repository.load(configPath);
  }

  getBoardConfiguration(boardId: SupportedBoardId, configPath?: string): BoardConfiguration {
    const workspaceConfiguration = this.repository.load(configPath);
    const boardConfiguration = workspaceConfiguration.boards.find(
      (candidate: BoardConfiguration) => candidate.id === boardId,
    );

    if (!boardConfiguration) {
      throw new Error(`Board configuration not found for board id: ${boardId}`);
    }

    return boardConfiguration;
  }
}
