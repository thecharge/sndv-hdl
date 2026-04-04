"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportedBoardProgrammer = exports.SupportedBoardVendor = exports.SupportedBoardId = exports.ContainerRuntime = void 0;
/** Container runtime used to execute the synthesis and flash toolchain. */
var ContainerRuntime;
(function (ContainerRuntime) {
    ContainerRuntime["Docker"] = "docker";
    ContainerRuntime["Podman"] = "podman";
})(ContainerRuntime || (exports.ContainerRuntime = ContainerRuntime = {}));
/** Identifier for a board with a verified end-to-end OSS toolchain. */
var SupportedBoardId;
(function (SupportedBoardId) {
    SupportedBoardId["TangNano20k"] = "tang_nano_20k";
    SupportedBoardId["TangNano9k"] = "tang_nano_9k";
})(SupportedBoardId || (exports.SupportedBoardId = SupportedBoardId = {}));
/** FPGA vendor for which Yosys synthesis plugins are available. */
var SupportedBoardVendor;
(function (SupportedBoardVendor) {
    SupportedBoardVendor["Gowin"] = "gowin";
})(SupportedBoardVendor || (exports.SupportedBoardVendor = SupportedBoardVendor = {}));
/** USB programmer tool used to flash bitstreams. */
var SupportedBoardProgrammer;
(function (SupportedBoardProgrammer) {
    SupportedBoardProgrammer["OpenFPGALoader"] = "openFPGALoader";
})(SupportedBoardProgrammer || (exports.SupportedBoardProgrammer = SupportedBoardProgrammer = {}));
//# sourceMappingURL=config.js.map