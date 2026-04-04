"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceConfigurationService = void 0;
class WorkspaceConfigurationService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    getWorkspaceConfiguration(configPath) {
        return this.repository.load(configPath);
    }
    getBoardConfiguration(boardId, configPath) {
        const workspaceConfiguration = this.repository.load(configPath);
        const boardConfiguration = workspaceConfiguration.boards.find((candidate) => candidate.id === boardId);
        if (!boardConfiguration) {
            throw new Error(`Board configuration not found for board id: ${boardId}`);
        }
        return boardConfiguration;
    }
}
exports.WorkspaceConfigurationService = WorkspaceConfigurationService;
//# sourceMappingURL=workspace-configuration-service.js.map