"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceConfigurationOverrideSchema = exports.workspaceConfigurationSchema = void 0;
const types_1 = require("@ts2v/types");
const zod_1 = require("zod");
const toolchainBinaryConfigurationSchema = zod_1.z.object({
    yosys: zod_1.z.string().min(1),
    nextpnr: zod_1.z.string().min(1),
    gowinPack: zod_1.z.string().min(1),
    programmer: zod_1.z.string().min(1),
});
const toolchainContainerConfigurationSchema = zod_1.z.object({
    image: zod_1.z.string().min(1),
    workDirectory: zod_1.z.string().min(1),
    runtimePriority: zod_1.z.array(zod_1.z.nativeEnum(types_1.ContainerRuntime)).min(1),
    usbDevicePaths: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    binaries: toolchainBinaryConfigurationSchema.partial().optional(),
});
const boardConfigurationSchema = zod_1.z.object({
    id: zod_1.z.nativeEnum(types_1.SupportedBoardId),
    vendor: zod_1.z.nativeEnum(types_1.SupportedBoardVendor),
    family: zod_1.z.string().min(1),
    part: zod_1.z.string().min(1),
    package: zod_1.z.string().min(1).optional(),
    programmer: zod_1.z.nativeEnum(types_1.SupportedBoardProgrammer),
    pnrDevice: zod_1.z.string().min(1),
    constraintFileExtension: zod_1.z.string().min(1),
    programmerProfiles: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string().min(1),
        cable: zod_1.z.string().min(1).optional(),
        vid: zod_1.z.string().min(1).optional(),
        pid: zod_1.z.string().min(1).optional(),
        cableIndex: zod_1.z.number().int().nonnegative().optional(),
        busdevNum: zod_1.z.string().min(1).optional(),
        ftdiSerial: zod_1.z.string().min(1).optional(),
        ftdiChannel: zod_1.z.number().int().nonnegative().optional(),
        extraArgs: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    }))
        .min(1)
        .optional(),
});
exports.workspaceConfigurationSchema = zod_1.z.object({
    defaultBoardId: zod_1.z.nativeEnum(types_1.SupportedBoardId),
    artifactsDirectoryPath: zod_1.z.string().min(1),
    container: toolchainContainerConfigurationSchema,
    boards: zod_1.z.array(boardConfigurationSchema).min(1),
});
exports.workspaceConfigurationOverrideSchema = zod_1.z.object({
    defaultBoardId: zod_1.z.nativeEnum(types_1.SupportedBoardId).optional(),
    artifactsDirectoryPath: zod_1.z.string().min(1).optional(),
    container: zod_1.z
        .object({
        image: zod_1.z.string().min(1).optional(),
        workDirectory: zod_1.z.string().min(1).optional(),
        runtimePriority: zod_1.z.array(zod_1.z.nativeEnum(types_1.ContainerRuntime)).min(1).optional(),
        usbDevicePaths: zod_1.z.array(zod_1.z.string().min(1)).optional(),
        binaries: toolchainBinaryConfigurationSchema.partial().optional(),
    })
        .optional(),
    boards: zod_1.z.array(boardConfigurationSchema).min(1).optional(),
});
//# sourceMappingURL=workspace-configuration-schema.js.map