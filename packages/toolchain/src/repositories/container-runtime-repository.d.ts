import type { RuntimeDetectionRepository } from '@ts2v/process';
import type { ContainerRuntime } from '@ts2v/types';
export declare class ContainerRuntimeRepository {
  private readonly runtimeDetectionRepository;
  constructor(runtimeDetectionRepository: RuntimeDetectionRepository);
  resolveRuntime(preferredRuntimes: ReadonlyArray<ContainerRuntime>): Promise<ContainerRuntime>;
}
