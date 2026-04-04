"use strict";
// Type checker: validates the AST and annotates expressions with hardware types.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeChecker = void 0;
const compiler_error_1 = require("../errors/compiler-error");
const ast_1 = require("../parser/ast");
const hardware_type_1 = require("./hardware-type");
const type_environment_1 = require("./type-environment");
const expression_checker_1 = require("./expression-checker");
class TypeChecker {
    environment = new type_environment_1.TypeEnvironment();
    current_function_locals = [];
    checked_functions = [];
    /**
     * Type-check the entire program AST.
     * @param program - The parsed ProgramNode.
     * @returns Array of checked function metadata for code generation.
     * @example
     *   const functions = new TypeChecker().check(ast);
     */
    check(program) {
        this.checked_functions = [];
        for (const func of program.body)
            this.checkFunction(func);
        return this.checked_functions;
    }
    checkFunction(func) {
        this.environment.pushScope();
        this.current_function_locals = [];
        const parameters = [];
        for (const param of func.parameters) {
            const hardware_type = this.resolveTypeAnnotation(param.type_annotation.type_name, param.type_annotation.array_size);
            this.environment.define({ name: param.name, hardware_type, is_const: false });
            parameters.push({ name: param.name, hardware_type });
        }
        const return_type = func.return_type
            ? this.resolveTypeAnnotation(func.return_type.type_name, func.return_type.array_size)
            : hardware_type_1.HARDWARE_TYPE_NUMBER;
        this.checkBlock(func.body);
        this.checked_functions.push({ name: func.name, parameters, return_type, locals: [...this.current_function_locals] });
        this.environment.popScope();
    }
    checkBlock(block) {
        for (const statement of block.statements)
            this.checkStatement(statement);
    }
    checkStatement(statement) {
        switch (statement.kind) {
            case ast_1.AstNodeKind.VariableDeclaration: {
                const init_type = (0, expression_checker_1.checkExpression)(statement.initializer, this.environment);
                let declared_type = init_type;
                if (statement.type_annotation) {
                    declared_type = this.resolveTypeAnnotation(statement.type_annotation.type_name, statement.type_annotation.array_size);
                    // Inherit array size from initializer when annotation omits explicit size
                    if (declared_type.array_size === 0 && init_type.array_size) {
                        declared_type = { ...declared_type, array_size: init_type.array_size };
                    }
                }
                if (this.environment.existsInCurrentScope(statement.name)) {
                    throw (0, compiler_error_1.typeError)(`Duplicate declaration "${statement.name}"`, statement.location);
                }
                const entry = { name: statement.name, hardware_type: declared_type, is_const: statement.is_const };
                this.environment.define(entry);
                this.current_function_locals.push({ name: statement.name, hardware_type: declared_type, is_const: statement.is_const });
                return;
            }
            case ast_1.AstNodeKind.ReturnStatement:
                (0, expression_checker_1.checkExpression)(statement.expression, this.environment);
                return;
            case ast_1.AstNodeKind.IfStatement:
                (0, expression_checker_1.checkExpression)(statement.condition, this.environment);
                this.checkBlock(statement.consequent);
                if (statement.alternate) {
                    if (statement.alternate.kind === ast_1.AstNodeKind.Block)
                        this.checkBlock(statement.alternate);
                    else
                        this.checkStatement(statement.alternate);
                }
                return;
            case ast_1.AstNodeKind.ExpressionStatement:
                (0, expression_checker_1.checkExpression)(statement.expression, this.environment);
                return;
        }
    }
    resolveTypeAnnotation(type_name, array_size) {
        switch (type_name) {
            case ast_1.TypeName.Number: return hardware_type_1.HARDWARE_TYPE_NUMBER;
            case ast_1.TypeName.Boolean: return hardware_type_1.HARDWARE_TYPE_BOOLEAN;
            case ast_1.TypeName.NumberArray: return (0, hardware_type_1.makeArrayType)(hardware_type_1.HARDWARE_TYPE_NUMBER, array_size ?? 0);
            case ast_1.TypeName.BooleanArray: return (0, hardware_type_1.makeArrayType)(hardware_type_1.HARDWARE_TYPE_BOOLEAN, array_size ?? 0);
        }
    }
}
exports.TypeChecker = TypeChecker;
//# sourceMappingURL=typechecker.js.map