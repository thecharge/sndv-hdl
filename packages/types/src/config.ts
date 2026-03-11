export enum ContainerRuntime {
  Docker = 'docker',
  Podman = 'podman',
}

export enum SupportedBoardId {
  TangNano20k = 'tang_nano_20k',
  TangNano9k = 'tang_nano_9k',
}

export enum SupportedBoardVendor {
  Gowin = 'gowin',
}

export enum SupportedBoardProgrammer {
  OpenFPGALoader = 'openFPGALoader',
}

export interface ProgrammerProfile {
  readonly name: string;
  readonly cable?: string;
  readonly vid?: string;
  readonly pid?: string;
  readonly cableIndex?: number;
  readonly busdevNum?: string;
  readonly ftdiSerial?: string;
  readonly ftdiChannel?: number;
  readonly extraArgs?: ReadonlyArray<string>;
}

export interface ToolchainBinaryConfiguration {
  readonly yosys: string;
  readonly nextpnr: string;
  readonly gowinPack: string;
  readonly programmer: string;
}

export interface ToolchainContainerConfiguration {
  readonly image: string;
  readonly workDirectory: string;
  readonly runtimePriority: ReadonlyArray<ContainerRuntime>;
  readonly usbDevicePaths?: ReadonlyArray<string>;
  readonly binaries?: Partial<ToolchainBinaryConfiguration>;
}

export interface BoardConfiguration {
  readonly id: SupportedBoardId;
  readonly vendor: SupportedBoardVendor;
  readonly family: string;
  readonly part: string;
  readonly package?: string;
  readonly programmer: SupportedBoardProgrammer;
  readonly pnrDevice: string;
  readonly constraintFileExtension: string;
  readonly programmerProfiles?: ReadonlyArray<ProgrammerProfile>;
}

export interface WorkspaceConfiguration {
  readonly defaultBoardId: SupportedBoardId;
  readonly artifactsDirectoryPath: string;
  readonly container: ToolchainContainerConfiguration;
  readonly boards: ReadonlyArray<BoardConfiguration>;
}
