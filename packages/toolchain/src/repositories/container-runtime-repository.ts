import type { RuntimeDetectionRepository } from '@ts2v/process';
import type { ContainerRuntime } from '@ts2v/types';

export class ContainerRuntimeRepository {
  constructor(private readonly runtimeDetectionRepository: RuntimeDetectionRepository) {}

  async resolveRuntime(
    preferredRuntimes: ReadonlyArray<ContainerRuntime>,
  ): Promise<ContainerRuntime> {
    for (const preferredRuntime of preferredRuntimes) {
      const exists = await this.runtimeDetectionRepository.hasCommand(preferredRuntime);
      if (exists) {
        return preferredRuntime;
      }
    }

    throw new Error(
      `No supported container runtime found from priorities: ${preferredRuntimes.join(', ')}`,
    );
  }
}
