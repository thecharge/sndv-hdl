import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorkspaceConfiguration } from '@ts2v/types';
import { DEFAULT_WORKSPACE_CONFIGURATION } from '../constants/default-workspace-configuration';
import {
  workspaceConfigurationOverrideSchema,
  workspaceConfigurationSchema,
} from '../schemas/workspace-configuration-schema';

export class WorkspaceConfigurationRepository {
  load(configPath?: string): WorkspaceConfiguration {
    const resolvedPath = configPath
      ? resolve(configPath)
      : resolve('configs/workspace.config.json');
    if (!existsSync(resolvedPath)) {
      return DEFAULT_WORKSPACE_CONFIGURATION;
    }

    const rawContent = readFileSync(resolvedPath, 'utf8');
    const parsedJson = JSON.parse(rawContent) as unknown;
    const parsedContent = workspaceConfigurationOverrideSchema.parse(parsedJson);

    const mergedConfiguration = {
      ...DEFAULT_WORKSPACE_CONFIGURATION,
      ...parsedContent,
      container: {
        ...DEFAULT_WORKSPACE_CONFIGURATION.container,
        ...(parsedContent.container ?? {}),
      },
      boards: parsedContent.boards ?? DEFAULT_WORKSPACE_CONFIGURATION.boards,
    };

    return workspaceConfigurationSchema.parse(mergedConfiguration) as WorkspaceConfiguration;
  }
}
