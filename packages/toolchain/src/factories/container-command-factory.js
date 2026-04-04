"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerCommandFactory = void 0;
class ContainerCommandFactory {
    createContainerCommand(options) {
        const { runtime, image, workspacePath, workDirectory, shellCommand } = options;
        const deviceArguments = (options.devicePaths ?? []).flatMap((devicePath) => [
            '--device',
            devicePath,
        ]);
        return {
            executable: runtime,
            args: [
                'run',
                '--rm',
                '-v',
                `${workspacePath}:${workDirectory}`,
                '-w',
                workDirectory,
                ...deviceArguments,
                image,
                'bash',
                '-lc',
                shellCommand,
            ],
        };
    }
}
exports.ContainerCommandFactory = ContainerCommandFactory;
//# sourceMappingURL=container-command-factory.js.map