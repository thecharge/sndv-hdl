"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BunProcessRunner = void 0;
const node_child_process_1 = require("node:child_process");
class BunProcessRunner {
    async run(command) {
        return new Promise((resolve, reject) => {
            const childProcess = (0, node_child_process_1.spawn)(command.executable, [...command.args], {
                cwd: command.cwd,
                env: {
                    ...process.env,
                    ...(command.env ?? {}),
                },
            });
            let standardOutput = '';
            let standardError = '';
            childProcess.stdout.on('data', (chunk) => {
                standardOutput += chunk.toString();
            });
            childProcess.stderr.on('data', (chunk) => {
                standardError += chunk.toString();
            });
            childProcess.on('error', reject);
            childProcess.on('close', (exitCode) => {
                resolve({
                    exitCode: exitCode ?? 1,
                    standardOutput,
                    standardError,
                });
            });
        });
    }
}
exports.BunProcessRunner = BunProcessRunner;
//# sourceMappingURL=bun-process-runner.js.map