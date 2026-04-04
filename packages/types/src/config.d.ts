/** Container runtime used to execute the synthesis and flash toolchain. */
export declare enum ContainerRuntime {
  Docker = 'docker',
  Podman = 'podman',
}
/** Identifier for a board with a verified end-to-end OSS toolchain. */
export declare enum SupportedBoardId {
  TangNano20k = 'tang_nano_20k',
  TangNano9k = 'tang_nano_9k',
}
/** FPGA vendor for which Yosys synthesis plugins are available. */
export declare enum SupportedBoardVendor {
  Gowin = 'gowin',
}
/** USB programmer tool used to flash bitstreams. */
export declare enum SupportedBoardProgrammer {
  OpenFPGALoader = 'openFPGALoader',
}
/**
 * USB programmer profile identifying the specific cable and device to use.
 *
 * Profiles are stored in `workspace.config.json` and selected per-board.
 * Multiple profiles may exist for one board when different programmer cables
 * (e.g. on-board vs. external JTAG) have different VID/PID combinations.
 */
export interface ProgrammerProfile {
  /** Human-readable name for this profile (used in logs and error messages). */
  readonly name: string;
  /** openFPGALoader `--cable` argument value. */
  readonly cable?: string;
  /** USB vendor ID (hex string, e.g. `"0x0403"`). */
  readonly vid?: string;
  /** USB product ID (hex string, e.g. `"0x6010"`). */
  readonly pid?: string;
  /** Zero-based index when multiple cables of the same type are present. */
  readonly cableIndex?: number;
  /** `bus:device` string for direct USB device targeting. */
  readonly busdevNum?: string;
  /** FTDI chip serial number for disambiguation. */
  readonly ftdiSerial?: string;
  /** FTDI channel index (0 = channel A, 1 = channel B). */
  readonly ftdiChannel?: number;
  /** Additional arguments passed verbatim to the programmer command. */
  readonly extraArgs?: ReadonlyArray<string>;
}
/** Paths to the toolchain binaries when running outside of a container. */
export interface ToolchainBinaryConfiguration {
  readonly yosys: string;
  readonly nextpnr: string;
  readonly gowinPack: string;
  readonly programmer: string;
}
/** Configuration for the containerised toolchain execution environment. */
export interface ToolchainContainerConfiguration {
  /** Container image tag (e.g. `ts2v-gowin-oss:latest`). */
  readonly image: string;
  /** Working directory inside the container where sources are mounted. */
  readonly workDirectory: string;
  /** Ordered list of container runtimes to try (first available wins). */
  readonly runtimePriority: ReadonlyArray<ContainerRuntime>;
  /** Host USB device paths to pass through into the container. */
  readonly usbDevicePaths?: ReadonlyArray<string>;
  /** Override specific binary paths inside the container image. */
  readonly binaries?: Partial<ToolchainBinaryConfiguration>;
}
/** Static description of a supported FPGA board and its toolchain parameters. */
export interface BoardConfiguration {
  /** Unique board identifier (must match a verified OSS end-to-end path). */
  readonly id: SupportedBoardId;
  /** FPGA vendor. */
  readonly vendor: SupportedBoardVendor;
  /** FPGA device family (e.g. `GW2AR-18`). */
  readonly family: string;
  /** Full part number string passed to place-and-route. */
  readonly part: string;
  /** Package designator (e.g. `QN88`). */
  readonly package?: string;
  /** Programmer tool for this board. */
  readonly programmer: SupportedBoardProgrammer;
  /** Device string passed to nextpnr `--device`. */
  readonly pnrDevice: string;
  /** File extension for generated constraint files (e.g. `.cst` for Gowin). */
  readonly constraintFileExtension: string;
  /** Ordered list of programmer profiles; first matching profile is used. */
  readonly programmerProfiles?: ReadonlyArray<ProgrammerProfile>;
}
/** Root workspace configuration loaded from `configs/workspace.config.json`. */
export interface WorkspaceConfiguration {
  /** Board used when no `--board` flag is supplied to the CLI. */
  readonly defaultBoardId: SupportedBoardId;
  /** Directory where generated artifacts are written (relative to workspace root). */
  readonly artifactsDirectoryPath: string;
  /** Container toolchain configuration. */
  readonly container: ToolchainContainerConfiguration;
  /** All boards registered in this workspace. */
  readonly boards: ReadonlyArray<BoardConfiguration>;
}
