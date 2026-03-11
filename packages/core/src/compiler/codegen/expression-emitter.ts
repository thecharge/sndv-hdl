// Expression-to-Verilog rendering: translates AST expressions to Verilog strings.

import { codegenError } from '../errors/compiler-error';
import { VERILOG_RESERVED_WORDS, VERILOG_ESCAPE_SUFFIX } from '../constants/keywords';
import { ExpressionNode, AstNodeKind, BinaryOperator } from '../parser/ast';

// Render an expression AST node to a Verilog string.
export function renderExpression(expression: ExpressionNode): string {
  switch (expression.kind) {
    case AstNodeKind.NumberLiteral:
      return `32'd${expression.value}`;
    case AstNodeKind.HexLiteral:
      return `32'h${expression.raw.toUpperCase()}`;
    case AstNodeKind.BinaryLiteral:
      return `${expression.raw.length}'b${expression.raw}`;
    case AstNodeKind.BooleanLiteral:
      return expression.value ? "1'b1" : "1'b0";
    case AstNodeKind.Identifier:
      return sanitizeIdentifier(expression.name);
    case AstNodeKind.BinaryExpression:
      return renderBinaryExpression(expression.operator, expression.left, expression.right);
    case AstNodeKind.UnaryExpression:
      return `(${expression.operator}${renderExpression(expression.operand)})`;
    case AstNodeKind.AssignmentExpression:
      return renderExpression(expression.value);
    case AstNodeKind.ArrayAccess:
      return `${sanitizeIdentifier(expression.array.name)}[${renderExpression(expression.index)}]`;
    case AstNodeKind.ArrayLiteral:
      throw codegenError('Array literals in expressions not supported in Verilog', expression.location);
  }
  // Exhaustive check: should never reach here
  const _exhaustive: never = expression;
  throw codegenError('Unsupported expression kind', (_exhaustive as ExpressionNode).location);
}

// Render a binary operation with the correct Verilog operator.
function renderBinaryExpression(operator: BinaryOperator, left: ExpressionNode, right: ExpressionNode): string {
  const verilog_operator = translateOperator(operator);
  return `(${renderExpression(left)} ${verilog_operator} ${renderExpression(right)})`;
}

// Map TS operators to Verilog equivalents.
function translateOperator(operator: BinaryOperator): string {
  if (operator === '===') return '==';
  if (operator === '!==') return '!=';
  return operator;
}

// Escape identifiers that clash with Verilog reserved words.
export function sanitizeIdentifier(name: string): string {
  if (VERILOG_RESERVED_WORDS.has(name)) return name + VERILOG_ESCAPE_SUFFIX;
  return name;
}
