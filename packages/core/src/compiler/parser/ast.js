"use strict";
// Abstract Syntax Tree node definitions for the TypeScript subset.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeName = exports.AstNodeKind = void 0;
var AstNodeKind;
(function (AstNodeKind) {
    AstNodeKind["Program"] = "Program";
    AstNodeKind["FunctionDeclaration"] = "FunctionDeclaration";
    AstNodeKind["Parameter"] = "Parameter";
    AstNodeKind["Block"] = "Block";
    AstNodeKind["VariableDeclaration"] = "VariableDeclaration";
    AstNodeKind["ReturnStatement"] = "ReturnStatement";
    AstNodeKind["IfStatement"] = "IfStatement";
    AstNodeKind["ExpressionStatement"] = "ExpressionStatement";
    AstNodeKind["AssignmentExpression"] = "AssignmentExpression";
    AstNodeKind["BinaryExpression"] = "BinaryExpression";
    AstNodeKind["UnaryExpression"] = "UnaryExpression";
    AstNodeKind["Identifier"] = "Identifier";
    AstNodeKind["NumberLiteral"] = "NumberLiteral";
    AstNodeKind["HexLiteral"] = "HexLiteral";
    AstNodeKind["BinaryLiteral"] = "BinaryLiteral";
    AstNodeKind["BooleanLiteral"] = "BooleanLiteral";
    AstNodeKind["ArrayLiteral"] = "ArrayLiteral";
    AstNodeKind["ArrayAccess"] = "ArrayAccess";
    AstNodeKind["SliceAccess"] = "SliceAccess";
    AstNodeKind["TypeAnnotation"] = "TypeAnnotation";
})(AstNodeKind || (exports.AstNodeKind = AstNodeKind = {}));
// -- Type annotation --
var TypeName;
(function (TypeName) {
    TypeName["Number"] = "number";
    TypeName["Boolean"] = "boolean";
    TypeName["NumberArray"] = "number[]";
    TypeName["BooleanArray"] = "boolean[]";
})(TypeName || (exports.TypeName = TypeName = {}));
//# sourceMappingURL=ast.js.map