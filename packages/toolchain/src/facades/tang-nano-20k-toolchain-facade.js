"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TangNano20kToolchainFacade = void 0;
const flash_bitstream_command_1 = require("../commands/flash-bitstream-command");
const tang_nano_20k_toolchain_factory_1 = require("../factories/tang-nano-20k-toolchain-factory");
class TangNano20kToolchainFacade {
    async synthesize(request) {
        const adapter = await new tang_nano_20k_toolchain_factory_1.TangNano20kToolchainFactory().create();
        return adapter.synthesize(request);
    }
    async flash(request) {
        const adapter = await new tang_nano_20k_toolchain_factory_1.TangNano20kToolchainFactory().create();
        const command = new flash_bitstream_command_1.FlashBitstreamCommand(adapter);
        return command.execute(request);
    }
}
exports.TangNano20kToolchainFacade = TangNano20kToolchainFacade;
//# sourceMappingURL=tang-nano-20k-toolchain-facade.js.map