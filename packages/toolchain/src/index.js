"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TangNano9kToolchainFactory = exports.getAdapter = exports.BoardRegistry = exports.TangNano20kToolchainFacade = void 0;
var tang_nano_20k_toolchain_facade_1 = require("./facades/tang-nano-20k-toolchain-facade");
Object.defineProperty(exports, "TangNano20kToolchainFacade", { enumerable: true, get: function () { return tang_nano_20k_toolchain_facade_1.TangNano20kToolchainFacade; } });
var board_registry_1 = require("./services/board-registry");
Object.defineProperty(exports, "BoardRegistry", { enumerable: true, get: function () { return board_registry_1.BoardRegistry; } });
Object.defineProperty(exports, "getAdapter", { enumerable: true, get: function () { return board_registry_1.getAdapter; } });
var tang_nano_9k_toolchain_factory_1 = require("./factories/tang-nano-9k-toolchain-factory");
Object.defineProperty(exports, "TangNano9kToolchainFactory", { enumerable: true, get: function () { return tang_nano_9k_toolchain_factory_1.TangNano9kToolchainFactory; } });
//# sourceMappingURL=index.js.map