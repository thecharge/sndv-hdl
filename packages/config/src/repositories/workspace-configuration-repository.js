"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceConfigurationRepository = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const default_workspace_configuration_1 = require("../constants/default-workspace-configuration");
const workspace_configuration_schema_1 = require("../schemas/workspace-configuration-schema");
class WorkspaceConfigurationRepository {
    load(configPath) {
        const resolvedPath = configPath
            ? (0, node_path_1.resolve)(configPath)
            : (0, node_path_1.resolve)('configs/workspace.config.json');
        if (!(0, node_fs_1.existsSync)(resolvedPath)) {
            return default_workspace_configuration_1.DEFAULT_WORKSPACE_CONFIGURATION;
        }
        const rawContent = (0, node_fs_1.readFileSync)(resolvedPath, 'utf8');
        const parsedJson = JSON.parse(rawContent);
        const parsedContent = workspace_configuration_schema_1.workspaceConfigurationOverrideSchema.parse(parsedJson);
        const mergedConfiguration = {
            ...default_workspace_configuration_1.DEFAULT_WORKSPACE_CONFIGURATION,
            ...parsedContent,
            container: {
                ...default_workspace_configuration_1.DEFAULT_WORKSPACE_CONFIGURATION.container,
                ...(parsedContent.container ?? {}),
            },
            boards: parsedContent.boards ?? default_workspace_configuration_1.DEFAULT_WORKSPACE_CONFIGURATION.boards,
        };
        return workspace_configuration_schema_1.workspaceConfigurationSchema.parse(mergedConfiguration);
    }
}
exports.WorkspaceConfigurationRepository = WorkspaceConfigurationRepository;
//# sourceMappingURL=workspace-configuration-repository.js.map