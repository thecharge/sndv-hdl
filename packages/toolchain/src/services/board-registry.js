"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardRegistry = void 0;
exports.getAdapter = getAdapter;
const types_1 = require("@ts2v/types");
const tang_nano_9k_toolchain_factory_1 = require("../factories/tang-nano-9k-toolchain-factory");
const tang_nano_20k_toolchain_factory_1 = require("../factories/tang-nano-20k-toolchain-factory");
exports.BoardRegistry = {
    [types_1.SupportedBoardId.TangNano20k]: () => new tang_nano_20k_toolchain_factory_1.TangNano20kToolchainFactory().create(),
    [types_1.SupportedBoardId.TangNano9k]: () => new tang_nano_9k_toolchain_factory_1.TangNano9kToolchainFactory().create(),
};
function getAdapter(boardId) {
    return exports.BoardRegistry[boardId];
}
//# sourceMappingURL=board-registry.js.map