export declare class RuntimeDetectionRepository {
  private readonly processRunner;
  hasCommand(executableName: string): Promise<boolean>;
}
