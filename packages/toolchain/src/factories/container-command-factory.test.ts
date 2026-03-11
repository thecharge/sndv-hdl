import { describe, expect, test } from 'bun:test';
import { ContainerRuntime } from '@ts2v/types';
import { ContainerCommandFactory } from './container-command-factory';

describe('ContainerCommandFactory', () => {
  test('creates a portable runtime command', () => {
    const factory = new ContainerCommandFactory();
    const command = factory.createContainerCommand({
      runtime: ContainerRuntime.Podman,
      image: 'ghcr.io/yosyshq/oss-cad-suite:latest',
      workspacePath: '/repo',
      workDirectory: '/workspace',
      shellCommand: 'echo ready',
    });

    expect(command.executable).toBe('podman');
    expect(command.args.includes('ghcr.io/yosyshq/oss-cad-suite:latest')).toBe(true);
    expect(command.args.includes('echo ready')).toBe(true);
  });
});
