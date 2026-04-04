"use strict";
// Expression type inference: resolves hardware types for all expression nodes.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_MAP = void 0;
exports.checkExpression = checkExpression;
const compiler_error_1 = require("../errors/compiler-error");
const ast_1 = require("../parser/ast");
const hardware_type_1 = require("./hardware-type");
// Inferred type storage, keyed by expression node identity.
exports.TYPE_MAP = new WeakMap();
// Resolve the hardware type of an expression, recording it in TYPE_MAP.
function checkExpression(expression, environment) {
    let result_type;
    switch (expression.kind) {
        case ast_1.AstNodeKind.NumberLiteral:
        case ast_1.AstNodeKind.HexLiteral:
        case ast_1.AstNodeKind.BinaryLiteral:
            result_type = hardware_type_1.HARDWARE_TYPE_NUMBER;
            break;
        case ast_1.AstNodeKind.BooleanLiteral:
            result_type = hardware_type_1.HARDWARE_TYPE_BOOLEAN;
            break;
        case ast_1.AstNodeKind.Identifier: {
            const entry = environment.lookup(expression.name);
            if (!entry)
                throw (0, compiler_error_1.typeError)(`Undeclared variable "${expression.name}"`, expression.location);
            result_type = entry.hardware_type;
            break;
        }
        case ast_1.AstNodeKind.BinaryExpression: {
            const left_type = checkExpression(expression.left, environment);
            const right_type = checkExpression(expression.right, environment);
            result_type = (0, hardware_type_1.resolveBinaryResultType)(left_type, right_type, expression.operator);
            break;
        }
        case ast_1.AstNodeKind.UnaryExpression:
            result_type = checkExpression(expression.operand, environment);
            break;
        case ast_1.AstNodeKind.AssignmentExpression: {
            if (expression.target.kind === ast_1.AstNodeKind.Identifier) {
                const entry = environment.lookup(expression.target.name);
                if (!entry)
                    throw (0, compiler_error_1.typeError)(`Undeclared variable "${expression.target.name}"`, expression.location);
                if (entry.is_const)
                    throw (0, compiler_error_1.typeError)(`Cannot reassign const "${expression.target.name}"`, expression.location);
            }
            result_type = checkExpression(expression.value, environment);
            break;
        }
        case ast_1.AstNodeKind.ArrayLiteral: {
            if (expression.elements.length === 0) {
                throw (0, compiler_error_1.typeError)('Empty array literals are not supported in hardware', expression.location);
            }
            const element_type = checkExpression(expression.elements[0], environment);
            for (let i = 1; i < expression.elements.length; i++)
                checkExpression(expression.elements[i], environment);
            result_type = (0, hardware_type_1.makeArrayType)(element_type, expression.elements.length);
            break;
        }
        case ast_1.AstNodeKind.ArrayAccess: {
            const array_entry = environment.lookup(expression.array.name);
            if (!array_entry)
                throw (0, compiler_error_1.typeError)(`Undeclared array "${expression.array.name}"`, expression.location);
            checkExpression(expression.index, environment);
            result_type = { ...array_entry.hardware_type, array_size: undefined };
            break;
        }
        case ast_1.AstNodeKind.SliceAccess: {
            const source_type = checkExpression(expression.source, environment);
            if (source_type.array_size !== undefined) {
                throw (0, compiler_error_1.typeError)('Bits.slice() source must be a logic type, not an array', expression.location);
            }
            checkExpression(expression.msb, environment);
            checkExpression(expression.lsb, environment);
            const msb_node = expression.msb;
            const lsb_node = expression.lsb;
            if (msb_node.kind === ast_1.AstNodeKind.NumberLiteral && lsb_node.kind === ast_1.AstNodeKind.NumberLiteral) {
                result_type = { ...hardware_type_1.HARDWARE_TYPE_NUMBER, bit_width: msb_node.value - lsb_node.value + 1 };
            }
            else {
                result_type = { ...hardware_type_1.HARDWARE_TYPE_NUMBER, bit_width: 1 };
            }
            break;
        }
    }
    exports.TYPE_MAP.set(expression, result_type);
    return result_type;
}
//# sourceMappingURL=expression-checker.js.map