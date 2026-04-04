"use strict";
// Expression-to-Verilog rendering: translates AST expressions to Verilog strings.
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderExpression = renderExpression;
exports.sanitizeIdentifier = sanitizeIdentifier;
const compiler_error_1 = require("../errors/compiler-error");
const keywords_1 = require("../constants/keywords");
const ast_1 = require("../parser/ast");
// Render an expression AST node to a Verilog string.
function renderExpression(expression) {
    switch (expression.kind) {
        case ast_1.AstNodeKind.NumberLiteral:
            return `32'd${expression.value}`;
        case ast_1.AstNodeKind.HexLiteral:
            return `32'h${expression.raw.toUpperCase()}`;
        case ast_1.AstNodeKind.BinaryLiteral:
            return `${expression.raw.length}'b${expression.raw}`;
        case ast_1.AstNodeKind.BooleanLiteral:
            return expression.value ? "1'b1" : "1'b0";
        case ast_1.AstNodeKind.Identifier:
            return sanitizeIdentifier(expression.name);
        case ast_1.AstNodeKind.BinaryExpression:
            return renderBinaryExpression(expression.operator, expression.left, expression.right);
        case ast_1.AstNodeKind.UnaryExpression:
            return `(${expression.operator}${renderExpression(expression.operand)})`;
        case ast_1.AstNodeKind.AssignmentExpression:
            return renderExpression(expression.value);
        case ast_1.AstNodeKind.ArrayAccess:
            return `${sanitizeIdentifier(expression.array.name)}[${renderExpression(expression.index)}]`;
        case ast_1.AstNodeKind.SliceAccess:
            return `${renderExpression(expression.source)}[${renderExpression(expression.msb)}:${renderExpression(expression.lsb)}]`;
        case ast_1.AstNodeKind.ArrayLiteral:
            throw (0, compiler_error_1.codegenError)('Array literals in expressions not supported in Verilog', expression.location);
    }
    // Exhaustive check: should never reach here
    const _exhaustive = expression;
    throw (0, compiler_error_1.codegenError)('Unsupported expression kind', _exhaustive.location);
}
// Render a binary operation with the correct Verilog operator.
function renderBinaryExpression(operator, left, right) {
    const verilog_operator = translateOperator(operator);
    return `(${renderExpression(left)} ${verilog_operator} ${renderExpression(right)})`;
}
// Map TS operators to Verilog equivalents.
function translateOperator(operator) {
    if (operator === '===')
        return '==';
    if (operator === '!==')
        return '!=';
    return operator;
}
// Escape identifiers that clash with Verilog reserved words.
function sanitizeIdentifier(name) {
    if (keywords_1.VERILOG_RESERVED_WORDS.has(name))
        return name + keywords_1.VERILOG_ESCAPE_SUFFIX;
    return name;
}
//# sourceMappingURL=expression-emitter.js.map