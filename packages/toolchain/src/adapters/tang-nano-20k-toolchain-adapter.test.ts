import { describe, expect, test } from 'bun:test';
import {
  type BoardConfiguration,
  ContainerRuntime,
  type ProcessCommand,
  type ProcessExecutionResult,
  type ProcessRunner,
  SupportedBoardId,
  SupportedBoardProgrammer,
  SupportedBoardVendor,
  type WorkspaceConfiguration,
} from '@ts2v/types';
import { ContainerCommandFactory } from '../factories/container-command-factory';
import { TangNano20kToolchainAdapter } from './tang-nano-20k-toolchain-adapter';

class RecordingRunner implements ProcessRunner {
  readonly commands: ProcessCommand[] = [];

  async run(command: ProcessCommand): Promise<ProcessExecutionResult> {
    this.commands.push(command);
    return {
      exitCode: 0,
      standardOutput: 'ok',
      standardError: '',
    };
  }
}

describe('TangNano20kToolchainAdapter', () => {
  test('flash uses explicit write-flash and verify flags', async () => {
    const processRunner = new RecordingRunner();
    const workspaceConfiguration: WorkspaceConfiguration = {
      defaultBoardId: SupportedBoardId.TangNano20k,
      artifactsDirectoryPath: '.artifacts',
      container: {
        image: 'ts2v-gowin-oss:latest',
        workDirectory: '/workspace',
        runtimePriority: [ContainerRuntime.Podman],
        usbDevicePaths: ['/dev/bus/usb'],
        binaries: {
          programmer: 'openFPGALoader',
        },
      },
      boards: [],
    };

    const boardConfiguration: BoardConfiguration = {
      id: SupportedBoardId.TangNano20k,
      vendor: SupportedBoardVendor.Gowin,
      family: 'GW2A',
      part: 'GW2AR-LV18QN88C8/I7',
      programmer: SupportedBoardProgrammer.OpenFPGALoader,
      pnrDevice: 'GW2A-18C',
      constraintFileExtension: '.cst',
      programmerProfiles: [
        {
          name: 'ftdi-ch552-jtag',
          cable: 'ch552_jtag',
          vid: '0x0403',
          pid: '0x6010',
        },
      ],
    };

    const adapter = new TangNano20kToolchainAdapter(
      processRunner,
      new ContainerCommandFactory(),
      workspaceConfiguration,
      boardConfiguration,
      ContainerRuntime.Podman,
    );

    await adapter.flash({
      bitstreamPath: '/tmp/test.fs',
      boardId: SupportedBoardId.TangNano20k,
    });

    expect(processRunner.commands.length).toBeGreaterThan(0);
    const flashCommand = processRunner.commands[0];
    const shellCommand = flashCommand.args[flashCommand.args.length - 1] ?? '';

    expect(shellCommand.includes('--write-flash')).toBe(true);
    expect(shellCommand.includes('--verify')).toBe(true);
    expect(shellCommand.includes('-b tangnano20k')).toBe(true);
  });
});
