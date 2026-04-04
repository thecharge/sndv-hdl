import type {
  BoardConfiguration,
  ContainerRuntime,
  FlashRequest,
  ProcessRunner,
  SynthesisRequest,
  ToolchainAdapter,
  ToolchainResult,
  WorkspaceConfiguration,
} from '@ts2v/types';
import type { ContainerCommandFactory } from '../factories/container-command-factory';
export declare class TangNano20kToolchainAdapter implements ToolchainAdapter {
  private readonly processRunner;
  private readonly containerCommandFactory;
  private readonly workspaceConfiguration;
  private readonly boardConfiguration;
  private readonly containerRuntime;
  constructor(
    processRunner: ProcessRunner,
    containerCommandFactory: ContainerCommandFactory,
    workspaceConfiguration: WorkspaceConfiguration,
    boardConfiguration: BoardConfiguration,
    containerRuntime: ContainerRuntime,
  );
  synthesize(request: SynthesisRequest): Promise<ToolchainResult>;
  flash(request: FlashRequest): Promise<ToolchainResult>;
  private resolveProgrammerProfiles;
  private buildProgrammerArgs;
  private shellJoin;
  private shellQuote;
  private toContainerPath;
}
