import { resolve } from 'node:path';
import type {
  BoardConfiguration,
  ContainerRuntime,
  FlashRequest,
  ProcessRunner,
  ProgrammerProfile,
  SynthesisRequest,
  ToolchainAdapter,
  ToolchainResult,
  WorkspaceConfiguration,
} from '@ts2v/types';
import type { ContainerCommandFactory } from '../factories/container-command-factory';

export class TangNano9kToolchainAdapter implements ToolchainAdapter {
  constructor(
    private readonly processRunner: ProcessRunner,
    private readonly containerCommandFactory: ContainerCommandFactory,
    private readonly workspaceConfiguration: WorkspaceConfiguration,
    private readonly boardConfiguration: BoardConfiguration,
    private readonly containerRuntime: ContainerRuntime,
  ) {}

  async synthesize(request: SynthesisRequest): Promise<ToolchainResult> {
    const outputDirectoryPath = resolve(request.compileRequest.outputDirectoryPath);
    const containerOutputDirectoryPath = this.toContainerPath(outputDirectoryPath);
    const sourceBaseName =
      request.compileRequest.inputPath.split('/').pop()?.replace(/\.ts$/, '') ??
      request.topModuleName;
    const topModuleName = request.topModuleName;
    const commandLog: string[] = [];
    const binaries = this.workspaceConfiguration.container.binaries;
    const yosysExecutable = binaries?.yosys ?? 'yosys';
    const nextpnrExecutable = binaries?.nextpnr ?? 'nextpnr-himbaechel';
    const gowinPackExecutable = binaries?.gowinPack ?? 'gowin_pack';

    const shellCommand = [
      'set -e',
      `${yosysExecutable} -p \"read_verilog -sv ${containerOutputDirectoryPath}/${sourceBaseName}.sv; synth_gowin -family gw1n -top ${topModuleName} -json ${containerOutputDirectoryPath}/${sourceBaseName}.json\"`,
      `${nextpnrExecutable} --json ${containerOutputDirectoryPath}/${sourceBaseName}.json --write ${containerOutputDirectoryPath}/${sourceBaseName}.pnr.json --device ${this.boardConfiguration.part} --vopt family=${this.boardConfiguration.pnrDevice} --vopt cst=${containerOutputDirectoryPath}/${this.boardConfiguration.id}.cst`,
      `${gowinPackExecutable} -d ${this.boardConfiguration.pnrDevice} -o ${containerOutputDirectoryPath}/${sourceBaseName}.fs ${containerOutputDirectoryPath}/${sourceBaseName}.pnr.json`,
    ].join(' && ');

    const command = this.containerCommandFactory.createContainerCommand({
      runtime: this.containerRuntime,
      image: this.workspaceConfiguration.container.image,
      workspacePath: process.cwd(),
      workDirectory: this.workspaceConfiguration.container.workDirectory,
      shellCommand,
    });

    commandLog.push([command.executable, ...command.args].join(' '));
    const result = await this.processRunner.run(command);

    const succeeded = result.exitCode === 0;
    const outputs = [result.standardOutput, result.standardError].filter(
      (entry) => entry.length > 0,
    );
    return { succeeded, commandLog, outputs };
  }

  async flash(request: FlashRequest): Promise<ToolchainResult> {
    const commandLog: string[] = [];
    const outputs: string[] = [];
    const binaries = this.workspaceConfiguration.container.binaries;
    const programmerExecutable = binaries?.programmer ?? 'openFPGALoader';
    const bitstreamPath = this.toContainerPath(request.bitstreamPath);
    const profiles = this.resolveProgrammerProfiles();

    for (const profile of profiles) {
      const profileArgs = this.buildProgrammerArgs(profile);
      const scanCommand = this.shellJoin([programmerExecutable, '--scan-usb']);
      const flashCommand = this.shellJoin([
        programmerExecutable,
        ...profileArgs,
        '--external-flash',
        '--write-flash',
        '--verify',
        '-r',
        '-b',
        'tangnano9k',
        bitstreamPath,
      ]);
      const shellCommand = `set -e; ${scanCommand}; ${flashCommand}`;

      const command = this.containerCommandFactory.createContainerCommand({
        runtime: this.containerRuntime,
        image: this.workspaceConfiguration.container.image,
        workspacePath: process.cwd(),
        workDirectory: this.workspaceConfiguration.container.workDirectory,
        shellCommand,
        devicePaths: this.workspaceConfiguration.container.usbDevicePaths,
      });

      const profileLabel = profile?.name ?? 'board-autodetect';
      commandLog.push(
        `[profile=${profileLabel}] ${[command.executable, ...command.args].join(' ')}`,
      );
      const result = await this.processRunner.run(command);
      if (result.standardOutput.length > 0) {
        outputs.push(`[profile=${profileLabel}]\n${result.standardOutput}`);
      }
      if (result.standardError.length > 0) {
        outputs.push(`[profile=${profileLabel}]\n${result.standardError}`);
      }

      if (result.exitCode === 0) {
        return { succeeded: true, commandLog, outputs };
      }
    }

    return { succeeded: false, commandLog, outputs };
  }

  private resolveProgrammerProfiles(): ReadonlyArray<ProgrammerProfile | undefined> {
    const profiles = this.boardConfiguration.programmerProfiles;
    if (!profiles || profiles.length === 0) {
      return [undefined];
    }

    const normalized = profiles.filter((profile) => profile.name !== 'board-autodetect');
    return [undefined, ...normalized];
  }

  private buildProgrammerArgs(profile: ProgrammerProfile | undefined): string[] {
    if (!profile) {
      return [];
    }

    const args: string[] = [];
    if (profile.cable) {
      args.push('-c', profile.cable);
    }
    if (profile.vid) {
      args.push('--vid', profile.vid);
    }
    if (profile.pid) {
      args.push('--pid', profile.pid);
    }
    if (profile.cableIndex !== undefined) {
      args.push('--cable-index', String(profile.cableIndex));
    }
    if (profile.busdevNum) {
      args.push('--busdev-num', profile.busdevNum);
    }
    if (profile.ftdiSerial) {
      args.push('--ftdi-serial', profile.ftdiSerial);
    }
    if (profile.ftdiChannel !== undefined) {
      args.push('--ftdi-channel', String(profile.ftdiChannel));
    }
    if (profile.extraArgs) {
      args.push(...profile.extraArgs);
    }

    return args;
  }

  private shellJoin(parts: ReadonlyArray<string>): string {
    return parts.map((part) => this.shellQuote(part)).join(' ');
  }

  private shellQuote(value: string): string {
    if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
      return value;
    }

    return `'${value.replace(/'/g, `'"'"'`)}'`;
  }

  private toContainerPath(hostPath: string): string {
    const normalizedHostWorkspacePath = resolve(process.cwd());
    const normalizedHostPath = resolve(hostPath);
    if (!normalizedHostPath.startsWith(`${normalizedHostWorkspacePath}/`)) {
      return normalizedHostPath;
    }

    const relativePath = normalizedHostPath.slice(normalizedHostWorkspacePath.length + 1);
    return `${this.workspaceConfiguration.container.workDirectory}/${relativePath}`;
  }
}
