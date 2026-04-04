"use strict";
// Hardware type representation for Verilog code generation.
Object.defineProperty(exports, "__esModule", { value: true });
exports.HARDWARE_TYPE_BOOLEAN = exports.HARDWARE_TYPE_NUMBER = exports.HardwareTypeKind = void 0;
exports.makeArrayType = makeArrayType;
exports.makeWireType = makeWireType;
exports.resolveBinaryResultType = resolveBinaryResultType;
const defaults_1 = require("../constants/defaults");
var HardwareTypeKind;
(function (HardwareTypeKind) {
    HardwareTypeKind["Wire"] = "Wire";
    HardwareTypeKind["Register"] = "Register";
    HardwareTypeKind["WireArray"] = "WireArray";
    HardwareTypeKind["RegisterArray"] = "RegisterArray";
})(HardwareTypeKind || (exports.HardwareTypeKind = HardwareTypeKind = {}));
// Standard hardware type for 32-bit number.
exports.HARDWARE_TYPE_NUMBER = {
    type_kind: HardwareTypeKind.Wire,
    bit_width: defaults_1.DEFAULT_BIT_WIDTH,
    is_signed: true,
};
// Standard hardware type for 1-bit boolean.
exports.HARDWARE_TYPE_BOOLEAN = {
    type_kind: HardwareTypeKind.Wire,
    bit_width: defaults_1.BOOLEAN_BIT_WIDTH,
    is_signed: false,
};
// Build an array hardware type.
function makeArrayType(element_type, array_size) {
    return {
        type_kind: HardwareTypeKind.WireArray,
        bit_width: element_type.bit_width,
        is_signed: element_type.is_signed,
        array_size,
    };
}
// Build a wire type with specific width.
function makeWireType(bit_width, is_signed) {
    return { type_kind: HardwareTypeKind.Wire, bit_width, is_signed };
}
// Compute the resulting type of a binary operation.
function resolveBinaryResultType(left, right, operator) {
    const is_comparison = ['===', '!==', '>', '<', '>=', '<='].includes(operator);
    if (is_comparison)
        return exports.HARDWARE_TYPE_BOOLEAN;
    const wider_bit_width = Math.max(left.bit_width, right.bit_width);
    const is_signed = left.is_signed && right.is_signed;
    return makeWireType(wider_bit_width, is_signed);
}
//# sourceMappingURL=hardware-type.js.map