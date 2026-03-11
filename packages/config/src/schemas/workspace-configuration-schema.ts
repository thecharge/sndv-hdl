import {
  ContainerRuntime,
  SupportedBoardId,
  SupportedBoardProgrammer,
  SupportedBoardVendor,
} from '@ts2v/types';
import { z } from 'zod';

const toolchainBinaryConfigurationSchema = z.object({
  yosys: z.string().min(1),
  nextpnr: z.string().min(1),
  gowinPack: z.string().min(1),
  programmer: z.string().min(1),
});

const toolchainContainerConfigurationSchema = z.object({
  image: z.string().min(1),
  workDirectory: z.string().min(1),
  runtimePriority: z.array(z.nativeEnum(ContainerRuntime)).min(1),
  usbDevicePaths: z.array(z.string().min(1)).optional(),
  binaries: toolchainBinaryConfigurationSchema.partial().optional(),
});

const boardConfigurationSchema = z.object({
  id: z.nativeEnum(SupportedBoardId),
  vendor: z.nativeEnum(SupportedBoardVendor),
  family: z.string().min(1),
  part: z.string().min(1),
  package: z.string().min(1).optional(),
  programmer: z.nativeEnum(SupportedBoardProgrammer),
  pnrDevice: z.string().min(1),
  constraintFileExtension: z.string().min(1),
  programmerProfiles: z
    .array(
      z.object({
        name: z.string().min(1),
        cable: z.string().min(1).optional(),
        vid: z.string().min(1).optional(),
        pid: z.string().min(1).optional(),
        cableIndex: z.number().int().nonnegative().optional(),
        busdevNum: z.string().min(1).optional(),
        ftdiSerial: z.string().min(1).optional(),
        ftdiChannel: z.number().int().nonnegative().optional(),
        extraArgs: z.array(z.string().min(1)).optional(),
      }),
    )
    .min(1)
    .optional(),
});

export const workspaceConfigurationSchema = z.object({
  defaultBoardId: z.nativeEnum(SupportedBoardId),
  artifactsDirectoryPath: z.string().min(1),
  container: toolchainContainerConfigurationSchema,
  boards: z.array(boardConfigurationSchema).min(1),
});

export const workspaceConfigurationOverrideSchema = z.object({
  defaultBoardId: z.nativeEnum(SupportedBoardId).optional(),
  artifactsDirectoryPath: z.string().min(1).optional(),
  container: z
    .object({
      image: z.string().min(1).optional(),
      workDirectory: z.string().min(1).optional(),
      runtimePriority: z.array(z.nativeEnum(ContainerRuntime)).min(1).optional(),
      usbDevicePaths: z.array(z.string().min(1)).optional(),
      binaries: toolchainBinaryConfigurationSchema.partial().optional(),
    })
    .optional(),
  boards: z.array(boardConfigurationSchema).min(1).optional(),
});
