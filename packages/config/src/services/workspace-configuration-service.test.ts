import { describe, expect, test } from 'bun:test';
import { SupportedBoardId, SupportedBoardProgrammer, SupportedBoardVendor } from '@ts2v/types';
import { WorkspaceConfigurationRepository } from '../repositories/workspace-configuration-repository';
import { WorkspaceConfigurationService } from './workspace-configuration-service';

describe('WorkspaceConfigurationService', () => {
  test('returns default board configuration for tang_nano_20k', () => {
    const service = new WorkspaceConfigurationService(new WorkspaceConfigurationRepository());
    const boardConfiguration = service.getBoardConfiguration(SupportedBoardId.TangNano20k);

    expect(boardConfiguration.vendor).toBe(SupportedBoardVendor.Gowin);
    expect(boardConfiguration.programmer).toBe(SupportedBoardProgrammer.OpenFPGALoader);
  });
});
