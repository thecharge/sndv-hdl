// Expression type inference: resolves hardware types for all expression nodes.

import { typeError } from '../errors/compiler-error';
import { ExpressionNode, AstNodeKind } from '../parser/ast';
import {
  HardwareType, HARDWARE_TYPE_NUMBER, HARDWARE_TYPE_BOOLEAN,
  makeArrayType, resolveBinaryResultType,
} from './hardware-type';
import { TypeEnvironment } from './type-environment';

// Inferred type storage, keyed by expression node identity.
export const TYPE_MAP = new WeakMap<ExpressionNode, HardwareType>();

// Resolve the hardware type of an expression, recording it in TYPE_MAP.
export function checkExpression(expression: ExpressionNode, environment: TypeEnvironment): HardwareType {
  let result_type: HardwareType;

  switch (expression.kind) {
    case AstNodeKind.NumberLiteral:
    case AstNodeKind.HexLiteral:
    case AstNodeKind.BinaryLiteral:
      result_type = HARDWARE_TYPE_NUMBER;
      break;
    case AstNodeKind.BooleanLiteral:
      result_type = HARDWARE_TYPE_BOOLEAN;
      break;
    case AstNodeKind.Identifier: {
      const entry = environment.lookup(expression.name);
      if (!entry) throw typeError(`Undeclared variable "${expression.name}"`, expression.location);
      result_type = entry.hardware_type;
      break;
    }
    case AstNodeKind.BinaryExpression: {
      const left_type = checkExpression(expression.left, environment);
      const right_type = checkExpression(expression.right, environment);
      result_type = resolveBinaryResultType(left_type, right_type, expression.operator);
      break;
    }
    case AstNodeKind.UnaryExpression:
      result_type = checkExpression(expression.operand, environment);
      break;
    case AstNodeKind.AssignmentExpression: {
      if (expression.target.kind === AstNodeKind.Identifier) {
        const entry = environment.lookup(expression.target.name);
        if (!entry) throw typeError(`Undeclared variable "${expression.target.name}"`, expression.location);
        if (entry.is_const) throw typeError(`Cannot reassign const "${expression.target.name}"`, expression.location);
      }
      result_type = checkExpression(expression.value, environment);
      break;
    }
    case AstNodeKind.ArrayLiteral: {
      if (expression.elements.length === 0) {
        throw typeError('Empty array literals are not supported in hardware', expression.location);
      }
      const element_type = checkExpression(expression.elements[0], environment);
      for (let i = 1; i < expression.elements.length; i++) checkExpression(expression.elements[i], environment);
      result_type = makeArrayType(element_type, expression.elements.length);
      break;
    }
    case AstNodeKind.ArrayAccess: {
      const array_entry = environment.lookup(expression.array.name);
      if (!array_entry) throw typeError(`Undeclared array "${expression.array.name}"`, expression.location);
      checkExpression(expression.index, environment);
      result_type = { ...array_entry.hardware_type, array_size: undefined };
      break;
    }
  }

  TYPE_MAP.set(expression, result_type!);
  return result_type!;
}
