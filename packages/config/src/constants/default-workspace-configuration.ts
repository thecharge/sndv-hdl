import {
  ContainerRuntime,
  SupportedBoardId,
  SupportedBoardProgrammer,
  SupportedBoardVendor,
  type WorkspaceConfiguration,
} from '@ts2v/types';

export const DEFAULT_WORKSPACE_CONFIGURATION: WorkspaceConfiguration = {
  defaultBoardId: SupportedBoardId.TangNano20k,
  artifactsDirectoryPath: '.artifacts',
  container: {
    image: 'ts2v-gowin-oss:latest',
    workDirectory: '/workspace',
    runtimePriority: [ContainerRuntime.Podman, ContainerRuntime.Docker],
    usbDevicePaths: ['/dev/bus/usb'],
    binaries: {
      yosys: 'yosys',
      nextpnr: 'nextpnr-himbaechel',
      gowinPack: 'gowin_pack',
      programmer: 'openFPGALoader',
    },
  },
  boards: [
    {
      id: SupportedBoardId.TangNano20k,
      vendor: SupportedBoardVendor.Gowin,
      family: 'GW2A',
      part: 'GW2AR-LV18QN88C8/I7',
      package: 'QN88',
      programmer: SupportedBoardProgrammer.OpenFPGALoader,
      pnrDevice: 'GW2A-18C',
      constraintFileExtension: '.cst',
      programmerProfiles: [
        {
          name: 'default-board-autodetect',
        },
      ],
    },
    {
      id: SupportedBoardId.TangNano9k,
      vendor: SupportedBoardVendor.Gowin,
      family: 'GW1N',
      part: 'GW1NR-LV9QN88PC6/I5',
      package: 'QN88',
      programmer: SupportedBoardProgrammer.OpenFPGALoader,
      pnrDevice: 'GW1N-9C',
      constraintFileExtension: '.cst',
      programmerProfiles: [
        {
          name: 'default-board-autodetect',
        },
      ],
    },
  ],
};
