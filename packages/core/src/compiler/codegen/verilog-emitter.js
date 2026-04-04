"use strict";
// Code generator: emits Verilog source from the typed AST.
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerilogEmitter = void 0;
const strings_1 = require("../constants/strings");
const ast_1 = require("../parser/ast");
const expression_emitter_1 = require("./expression-emitter");
const compiler_error_1 = require("../errors/compiler-error");
class VerilogEmitter {
    output = [];
    indent_level = 0;
    checked_functions;
    constructor(checked_functions) {
        const map = new Map();
        for (const func of checked_functions)
            map.set(func.name, func);
        this.checked_functions = map;
    }
    /**
     * Generate Verilog source for the entire program.
     * @param program - The parsed ProgramNode AST.
     * @returns Complete Verilog source as a string.
     * @example
     *   const verilog = new VerilogEmitter(checkedFunctions).emit(ast);
     */
    emit(program) {
        this.output = [];
        this.emitLine(strings_1.VERILOG_HEADER);
        this.emitLine(strings_1.VERILOG_TIMESCALE);
        this.emitLine(strings_1.VERILOG_DEFAULT_NETTYPE_NONE);
        this.emitLine('');
        for (let i = 0; i < program.body.length; i++) {
            if (i > 0)
                this.emitLine('');
            this.emitFunction(program.body[i]);
        }
        this.emitLine('');
        this.emitLine(strings_1.VERILOG_DEFAULT_NETTYPE_WIRE);
        return this.output.join('\n');
    }
    emitFunction(func) {
        const checked = this.checked_functions.get(func.name);
        if (!checked)
            throw (0, compiler_error_1.codegenError)(`Missing type info for "${func.name}"`, func.location);
        const module_name = (0, expression_emitter_1.sanitizeIdentifier)(func.name);
        this.emitLine(`module ${module_name} (`);
        this.indent_level++;
        this.emitPorts(checked);
        this.indent_level--;
        this.emitLine(');');
        this.emitLine('');
        this.indent_level++;
        this.emitLocalDeclarations(checked);
        this.emitLine('');
        for (const statement of func.body.statements)
            this.emitStatement(statement);
        this.indent_level--;
        this.emitLine('');
        this.emitLine('endmodule');
    }
    emitPorts(checked) {
        const port_lines = [];
        for (const param of checked.parameters) {
            port_lines.push(`input  logic ${this.formatBitWidth(param.hardware_type)} ${(0, expression_emitter_1.sanitizeIdentifier)(param.name)}`);
        }
        port_lines.push(`output logic ${this.formatBitWidth(checked.return_type)} ${(0, expression_emitter_1.sanitizeIdentifier)('result')}`);
        for (let i = 0; i < port_lines.length; i++) {
            this.emitLine(`${port_lines[i]}${i < port_lines.length - 1 ? ',' : ''}`);
        }
    }
    emitLocalDeclarations(checked) {
        if (checked.locals.length === 0)
            return;
        this.emitLine('// Internal signals');
        for (const local of checked.locals) {
            const width = this.formatBitWidth(local.hardware_type);
            const name = (0, expression_emitter_1.sanitizeIdentifier)(local.name);
            if (local.hardware_type.array_size !== undefined && local.hardware_type.array_size > 0) {
                this.emitLine(`logic ${width} ${name} [0:${local.hardware_type.array_size - 1}];`);
            }
            else {
                this.emitLine(`logic ${width} ${name};`);
            }
        }
    }
    emitStatement(statement) {
        switch (statement.kind) {
            case ast_1.AstNodeKind.ReturnStatement:
                this.emitLine(`assign ${(0, expression_emitter_1.sanitizeIdentifier)('result')} = ${(0, expression_emitter_1.renderExpression)(statement.expression)};`);
                return;
            case ast_1.AstNodeKind.VariableDeclaration:
                this.emitLine(`assign ${(0, expression_emitter_1.sanitizeIdentifier)(statement.name)} = ${(0, expression_emitter_1.renderExpression)(statement.initializer)};`);
                return;
            case ast_1.AstNodeKind.IfStatement:
                this.emitIfAssignments(statement);
                return;
            case ast_1.AstNodeKind.ExpressionStatement:
                if (statement.expression.kind === ast_1.AstNodeKind.AssignmentExpression) {
                    const target = (0, expression_emitter_1.renderExpression)(statement.expression.target);
                    const value = (0, expression_emitter_1.renderExpression)(statement.expression.value);
                    this.emitLine(`assign ${target} = ${value};`);
                }
                return;
        }
    }
    // Flatten if/else into ternary assign statements.
    emitIfAssignments(statement) {
        const condition = (0, expression_emitter_1.renderExpression)(statement.condition);
        const consequent_map = this.extractAssignments(statement.consequent);
        const alternate_map = statement.alternate ? this.extractAssignmentsFromAlternate(statement.alternate) : new Map();
        for (const [target, consequent_value] of consequent_map) {
            const alternate_value = alternate_map.get(target) ?? target;
            this.emitLine(`assign ${target} = ${condition} ? ${consequent_value} : ${alternate_value};`);
        }
        for (const [target, alternate_value] of alternate_map) {
            if (!consequent_map.has(target)) {
                this.emitLine(`assign ${target} = ${condition} ? ${target} : ${alternate_value};`);
            }
        }
    }
    // Extract target->value pairs from a block for ternary generation.
    extractAssignments(block) {
        const result = new Map();
        for (const stmt of block.statements) {
            if (stmt.kind === ast_1.AstNodeKind.ReturnStatement) {
                result.set((0, expression_emitter_1.sanitizeIdentifier)('result'), (0, expression_emitter_1.renderExpression)(stmt.expression));
            }
            else if (stmt.kind === ast_1.AstNodeKind.VariableDeclaration) {
                result.set((0, expression_emitter_1.sanitizeIdentifier)(stmt.name), (0, expression_emitter_1.renderExpression)(stmt.initializer));
            }
            else if (stmt.kind === ast_1.AstNodeKind.ExpressionStatement && stmt.expression.kind === ast_1.AstNodeKind.AssignmentExpression) {
                result.set((0, expression_emitter_1.renderExpression)(stmt.expression.target), (0, expression_emitter_1.renderExpression)(stmt.expression.value));
            }
            else if (stmt.kind === ast_1.AstNodeKind.IfStatement) {
                const nested_cond = (0, expression_emitter_1.renderExpression)(stmt.condition);
                const nested_con = this.extractAssignments(stmt.consequent);
                const nested_alt = stmt.alternate ? this.extractAssignmentsFromAlternate(stmt.alternate) : new Map();
                for (const [t, cv] of nested_con) {
                    result.set(t, `${nested_cond} ? ${cv} : ${nested_alt.get(t) ?? t}`);
                }
            }
        }
        return result;
    }
    // Handle alternate branch which can be Block or IfStatement.
    extractAssignmentsFromAlternate(alternate) {
        if (alternate.kind === ast_1.AstNodeKind.Block)
            return this.extractAssignments(alternate);
        // Nested if: treat as single-statement block
        const nested_cond = (0, expression_emitter_1.renderExpression)(alternate.condition);
        const nested_con = this.extractAssignments(alternate.consequent);
        const nested_alt = alternate.alternate ? this.extractAssignmentsFromAlternate(alternate.alternate) : new Map();
        const result = new Map();
        for (const [t, cv] of nested_con) {
            result.set(t, `${nested_cond} ? ${cv} : ${nested_alt.get(t) ?? t}`);
        }
        return result;
    }
    formatBitWidth(type) {
        if (type.bit_width === 1)
            return '';
        return `[${type.bit_width - 1}:0]`;
    }
    emitLine(text) {
        if (text === '') {
            this.output.push('');
            return;
        }
        this.output.push('    '.repeat(this.indent_level) + text);
    }
}
exports.VerilogEmitter = VerilogEmitter;
//# sourceMappingURL=verilog-emitter.js.map