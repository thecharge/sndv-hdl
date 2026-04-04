"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TangNano9kToolchainFactory = void 0;
const config_1 = require("@ts2v/config");
const process_1 = require("@ts2v/process");
const types_1 = require("@ts2v/types");
const tang_nano_9k_toolchain_adapter_1 = require("../adapters/tang-nano-9k-toolchain-adapter");
const container_runtime_repository_1 = require("../repositories/container-runtime-repository");
const container_command_factory_1 = require("./container-command-factory");
class TangNano9kToolchainFactory {
    async create() {
        const workspaceConfigurationService = new config_1.WorkspaceConfigurationService(new config_1.WorkspaceConfigurationRepository());
        const workspaceConfiguration = workspaceConfigurationService.getWorkspaceConfiguration();
        const boardConfiguration = workspaceConfigurationService.getBoardConfiguration(types_1.SupportedBoardId.TangNano9k);
        const runtimeDetectionRepository = new process_1.RuntimeDetectionRepository();
        const containerRuntimeRepository = new container_runtime_repository_1.ContainerRuntimeRepository(runtimeDetectionRepository);
        const containerRuntime = await containerRuntimeRepository.resolveRuntime(workspaceConfiguration.container.runtimePriority);
        return new tang_nano_9k_toolchain_adapter_1.TangNano9kToolchainAdapter(new process_1.BunProcessRunner(), new container_command_factory_1.ContainerCommandFactory(), workspaceConfiguration, boardConfiguration, containerRuntime);
    }
}
exports.TangNano9kToolchainFactory = TangNano9kToolchainFactory;
//# sourceMappingURL=tang-nano-9k-toolchain-factory.js.map