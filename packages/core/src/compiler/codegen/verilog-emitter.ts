// Code generator: emits Verilog source from the typed AST.

import { VERILOG_HEADER, VERILOG_TIMESCALE, VERILOG_DEFAULT_NETTYPE_NONE, VERILOG_DEFAULT_NETTYPE_WIRE } from '../constants/strings';
import {
  ProgramNode, FunctionDeclarationNode, StatementNode,
  IfStatementNode, BlockNode, AstNodeKind,
} from '../parser/ast';
import { CheckedFunction } from '../typechecker/typechecker';
import { HardwareType } from '../typechecker/hardware-type';
import { renderExpression, sanitizeIdentifier } from './expression-emitter';
import { codegenError } from '../errors/compiler-error';

export class VerilogEmitter {
  private output: string[] = [];
  private indent_level: number = 0;
  private readonly checked_functions: ReadonlyMap<string, CheckedFunction>;

  constructor(checked_functions: CheckedFunction[]) {
    const map = new Map<string, CheckedFunction>();
    for (const func of checked_functions) map.set(func.name, func);
    this.checked_functions = map;
  }

  /**
   * Generate Verilog source for the entire program.
   * @param program - The parsed ProgramNode AST.
   * @returns Complete Verilog source as a string.
   * @example
   *   const verilog = new VerilogEmitter(checkedFunctions).emit(ast);
   */
  emit(program: ProgramNode): string {
    this.output = [];
    this.emitLine(VERILOG_HEADER);
    this.emitLine(VERILOG_TIMESCALE);
    this.emitLine(VERILOG_DEFAULT_NETTYPE_NONE);
    this.emitLine('');
    for (let i = 0; i < program.body.length; i++) {
      if (i > 0) this.emitLine('');
      this.emitFunction(program.body[i]);
    }
    this.emitLine('');
    this.emitLine(VERILOG_DEFAULT_NETTYPE_WIRE);
    return this.output.join('\n');
  }

  private emitFunction(func: FunctionDeclarationNode): void {
    const checked = this.checked_functions.get(func.name);
    if (!checked) throw codegenError(`Missing type info for "${func.name}"`, func.location);
    const module_name = sanitizeIdentifier(func.name);
    this.emitLine(`module ${module_name} (`);
    this.indent_level++;
    this.emitPorts(checked);
    this.indent_level--;
    this.emitLine(');');
    this.emitLine('');
    this.indent_level++;
    this.emitLocalDeclarations(checked);
    this.emitLine('');
    for (const statement of func.body.statements) this.emitStatement(statement);
    this.indent_level--;
    this.emitLine('');
    this.emitLine('endmodule');
  }

  private emitPorts(checked: CheckedFunction): void {
    const port_lines: string[] = [];
    for (const param of checked.parameters) {
      port_lines.push(`input  wire ${this.formatBitWidth(param.hardware_type)} ${sanitizeIdentifier(param.name)}`);
    }
    port_lines.push(`output wire ${this.formatBitWidth(checked.return_type)} ${sanitizeIdentifier('result')}`);
    for (let i = 0; i < port_lines.length; i++) {
      this.emitLine(`${port_lines[i]}${i < port_lines.length - 1 ? ',' : ''}`);
    }
  }

  private emitLocalDeclarations(checked: CheckedFunction): void {
    if (checked.locals.length === 0) return;
    this.emitLine('// Internal signals');
    for (const local of checked.locals) {
      const width = this.formatBitWidth(local.hardware_type);
      const name = sanitizeIdentifier(local.name);
      if (local.hardware_type.array_size !== undefined && local.hardware_type.array_size > 0) {
        this.emitLine(`wire ${width} ${name} [0:${local.hardware_type.array_size - 1}];`);
      } else {
        this.emitLine(`wire ${width} ${name};`);
      }
    }
  }

  private emitStatement(statement: StatementNode): void {
    switch (statement.kind) {
      case AstNodeKind.ReturnStatement:
        this.emitLine(`assign ${sanitizeIdentifier('result')} = ${renderExpression(statement.expression)};`);
        return;
      case AstNodeKind.VariableDeclaration:
        this.emitLine(`assign ${sanitizeIdentifier(statement.name)} = ${renderExpression(statement.initializer)};`);
        return;
      case AstNodeKind.IfStatement:
        this.emitIfAssignments(statement);
        return;
      case AstNodeKind.ExpressionStatement:
        if (statement.expression.kind === AstNodeKind.AssignmentExpression) {
          const target = renderExpression(statement.expression.target);
          const value = renderExpression(statement.expression.value);
          this.emitLine(`assign ${target} = ${value};`);
        }
        return;
    }
  }

  // Flatten if/else into ternary assign statements.
  private emitIfAssignments(statement: IfStatementNode): void {
    const condition = renderExpression(statement.condition);
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
  private extractAssignments(block: BlockNode): Map<string, string> {
    const result = new Map<string, string>();
    for (const stmt of block.statements) {
      if (stmt.kind === AstNodeKind.ReturnStatement) {
        result.set(sanitizeIdentifier('result'), renderExpression(stmt.expression));
      } else if (stmt.kind === AstNodeKind.VariableDeclaration) {
        result.set(sanitizeIdentifier(stmt.name), renderExpression(stmt.initializer));
      } else if (stmt.kind === AstNodeKind.ExpressionStatement && stmt.expression.kind === AstNodeKind.AssignmentExpression) {
        result.set(renderExpression(stmt.expression.target), renderExpression(stmt.expression.value));
      } else if (stmt.kind === AstNodeKind.IfStatement) {
        const nested_cond = renderExpression(stmt.condition);
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
  private extractAssignmentsFromAlternate(alternate: BlockNode | IfStatementNode): Map<string, string> {
    if (alternate.kind === AstNodeKind.Block) return this.extractAssignments(alternate);
    // Nested if: treat as single-statement block
    const nested_cond = renderExpression(alternate.condition);
    const nested_con = this.extractAssignments(alternate.consequent);
    const nested_alt = alternate.alternate ? this.extractAssignmentsFromAlternate(alternate.alternate) : new Map();
    const result = new Map<string, string>();
    for (const [t, cv] of nested_con) {
      result.set(t, `${nested_cond} ? ${cv} : ${nested_alt.get(t) ?? t}`);
    }
    return result;
  }

  private formatBitWidth(type: HardwareType): string {
    if (type.bit_width === 1) return '';
    return `[${type.bit_width - 1}:0]`;
  }

  private emitLine(text: string): void {
    if (text === '') { this.output.push(''); return; }
    this.output.push('    '.repeat(this.indent_level) + text);
  }
}
