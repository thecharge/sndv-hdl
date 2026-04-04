"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlashBitstreamCommand = void 0;
class FlashBitstreamCommand {
    toolchainAdapter;
    constructor(toolchainAdapter) {
        this.toolchainAdapter = toolchainAdapter;
    }
    async execute(request) {
        return this.toolchainAdapter.flash(request);
    }
}
exports.FlashBitstreamCommand = FlashBitstreamCommand;
//# sourceMappingURL=flash-bitstream-command.js.map