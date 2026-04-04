"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerRuntimeRepository = void 0;
class ContainerRuntimeRepository {
    runtimeDetectionRepository;
    constructor(runtimeDetectionRepository) {
        this.runtimeDetectionRepository = runtimeDetectionRepository;
    }
    async resolveRuntime(preferredRuntimes) {
        for (const preferredRuntime of preferredRuntimes) {
            const exists = await this.runtimeDetectionRepository.hasCommand(preferredRuntime);
            if (exists) {
                return preferredRuntime;
            }
        }
        throw new Error(`No supported container runtime found from priorities: ${preferredRuntimes.join(', ')}`);
    }
}
exports.ContainerRuntimeRepository = ContainerRuntimeRepository;
//# sourceMappingURL=container-runtime-repository.js.map