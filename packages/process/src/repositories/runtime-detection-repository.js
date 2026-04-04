"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeDetectionRepository = void 0;
const bun_process_runner_1 = require("../runners/bun-process-runner");
class RuntimeDetectionRepository {
    processRunner = new bun_process_runner_1.BunProcessRunner();
    async hasCommand(executableName) {
        const result = await this.processRunner.run({
            executable: 'bash',
            args: ['-lc', `command -v ${executableName}`],
        });
        return result.exitCode === 0;
    }
}
exports.RuntimeDetectionRepository = RuntimeDetectionRepository;
//# sourceMappingURL=runtime-detection-repository.js.map