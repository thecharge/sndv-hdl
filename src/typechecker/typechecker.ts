// Type checker: validates the AST and annotates expressions with hardware types.

import { typeError } from '../errors/compiler-error';
import {
  ProgramNode, FunctionDeclarationNode, StatementNode,
  AstNodeKind, TypeName, BlockNode,
} from '../parser/ast';
import {
  HardwareType, HARDWARE_TYPE_NUMBER, HARDWARE_TYPE_BOOLEAN,
  makeArrayType,
} from './hardware-type';
import { TypeEnvironment, SymbolEntry } from './type-environment';
import { checkExpression } from './expression-checker';

// Checked function metadata for code generation.
export interface CheckedFunction {
  readonly name: string;
  readonly parameters: ReadonlyArray<{ name: string; hardware_type: HardwareType }>;
  readonly return_type: HardwareType;
  readonly locals: ReadonlyArray<{ name: string; hardware_type: HardwareType; is_const: boolean }>;
}

export class TypeChecker {
  private readonly environment = new TypeEnvironment();
  private current_function_locals: Array<{ name: string; hardware_type: HardwareType; is_const: boolean }> = [];
  private checked_functions: CheckedFunction[] = [];

  /**
   * Type-check the entire program AST.
   * @param program - The parsed ProgramNode.
   * @returns Array of checked function metadata for code generation.
   * @example
   *   const functions = new TypeChecker().check(ast);
   */
  check(program: ProgramNode): CheckedFunction[] {
    this.checked_functions = [];
    for (const func of program.body) this.checkFunction(func);
    return this.checked_functions;
  }

  private checkFunction(func: FunctionDeclarationNode): void {
    this.environment.pushScope();
    this.current_function_locals = [];
    const parameters: Array<{ name: string; hardware_type: HardwareType }> = [];
    for (const param of func.parameters) {
      const hardware_type = this.resolveTypeAnnotation(param.type_annotation.type_name, param.type_annotation.array_size);
      this.environment.define({ name: param.name, hardware_type, is_const: false });
      parameters.push({ name: param.name, hardware_type });
    }
    const return_type = func.return_type
      ? this.resolveTypeAnnotation(func.return_type.type_name, func.return_type.array_size)
      : HARDWARE_TYPE_NUMBER;
    this.checkBlock(func.body);
    this.checked_functions.push({ name: func.name, parameters, return_type, locals: [...this.current_function_locals] });
    this.environment.popScope();
  }

  private checkBlock(block: BlockNode): void {
    for (const statement of block.statements) this.checkStatement(statement);
  }

  private checkStatement(statement: StatementNode): void {
    switch (statement.kind) {
      case AstNodeKind.VariableDeclaration: {
        const init_type = checkExpression(statement.initializer, this.environment);
        let declared_type = init_type;
        if (statement.type_annotation) {
          declared_type = this.resolveTypeAnnotation(statement.type_annotation.type_name, statement.type_annotation.array_size);
          // Inherit array size from initializer when annotation omits explicit size
          if (declared_type.array_size === 0 && init_type.array_size) {
            declared_type = { ...declared_type, array_size: init_type.array_size };
          }
        }
        if (this.environment.existsInCurrentScope(statement.name)) {
          throw typeError(`Duplicate declaration "${statement.name}"`, statement.location);
        }
        const entry: SymbolEntry = { name: statement.name, hardware_type: declared_type, is_const: statement.is_const };
        this.environment.define(entry);
        this.current_function_locals.push({ name: statement.name, hardware_type: declared_type, is_const: statement.is_const });
        return;
      }
      case AstNodeKind.ReturnStatement:
        checkExpression(statement.expression, this.environment);
        return;
      case AstNodeKind.IfStatement:
        checkExpression(statement.condition, this.environment);
        this.checkBlock(statement.consequent);
        if (statement.alternate) {
          if (statement.alternate.kind === AstNodeKind.Block) this.checkBlock(statement.alternate);
          else this.checkStatement(statement.alternate);
        }
        return;
      case AstNodeKind.ExpressionStatement:
        checkExpression(statement.expression, this.environment);
        return;
    }
  }

  private resolveTypeAnnotation(type_name: TypeName, array_size?: number): HardwareType {
    switch (type_name) {
      case TypeName.Number: return HARDWARE_TYPE_NUMBER;
      case TypeName.Boolean: return HARDWARE_TYPE_BOOLEAN;
      case TypeName.NumberArray: return makeArrayType(HARDWARE_TYPE_NUMBER, array_size ?? 0);
      case TypeName.BooleanArray: return makeArrayType(HARDWARE_TYPE_BOOLEAN, array_size ?? 0);
    }
  }
}
