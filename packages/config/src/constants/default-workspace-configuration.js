"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WORKSPACE_CONFIGURATION = void 0;
const types_1 = require("@ts2v/types");
exports.DEFAULT_WORKSPACE_CONFIGURATION = {
    defaultBoardId: types_1.SupportedBoardId.TangNano20k,
    artifactsDirectoryPath: '.artifacts',
    container: {
        image: 'ts2v-gowin-oss:latest',
        workDirectory: '/workspace',
        runtimePriority: [types_1.ContainerRuntime.Podman, types_1.ContainerRuntime.Docker],
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
            id: types_1.SupportedBoardId.TangNano20k,
            vendor: types_1.SupportedBoardVendor.Gowin,
            family: 'GW2A',
            part: 'GW2AR-LV18QN88C8/I7',
            package: 'QN88',
            programmer: types_1.SupportedBoardProgrammer.OpenFPGALoader,
            pnrDevice: 'GW2A-18C',
            constraintFileExtension: '.cst',
            programmerProfiles: [
                {
                    name: 'default-board-autodetect',
                },
            ],
        },
        {
            id: types_1.SupportedBoardId.TangNano9k,
            vendor: types_1.SupportedBoardVendor.Gowin,
            family: 'GW1N',
            part: 'GW1NR-LV9QN88PC6/I5',
            package: 'QN88',
            programmer: types_1.SupportedBoardProgrammer.OpenFPGALoader,
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
//# sourceMappingURL=default-workspace-configuration.js.map