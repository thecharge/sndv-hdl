// Expression parser: precedence climbing for all TS expression types.

import { TokenKind } from '../lexer/token';
import { parserError } from '../errors/compiler-error';
import {
  ExpressionNode, BinaryExpressionNode, IdentifierNode,
  ArrayLiteralNode, ArrayAccessNode, AssignmentExpressionNode,
  AstNodeKind, BinaryOperator,
} from './ast';
import { TokenReader } from './token-reader';

export class ExpressionParser extends TokenReader {

  protected parseExpression(): ExpressionNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ExpressionNode {
    const expression = this.parseBitwiseOr();
    if (!this.check(TokenKind.Equals)) return expression;

    this.advance();
    const value = this.parseAssignment();
    if (expression.kind !== AstNodeKind.Identifier && expression.kind !== AstNodeKind.ArrayAccess) {
      throw parserError('Invalid assignment target', expression.location);
    }
    return {
      kind: AstNodeKind.AssignmentExpression,
      target: expression as IdentifierNode | ArrayAccessNode,
      value,
      location: expression.location,
    } as AssignmentExpressionNode;
  }

  private parseBitwiseOr(): ExpressionNode {
    let left = this.parseBitwiseXor();
    while (this.check(TokenKind.Pipe)) {
      const operator = this.advance().value as BinaryOperator;
      left = this.makeBinary(operator, left, this.parseBitwiseXor());
    }
    return left;
  }

  private parseBitwiseXor(): ExpressionNode {
    let left = this.parseBitwiseAnd();
    while (this.check(TokenKind.Caret)) {
      const operator = this.advance().value as BinaryOperator;
      left = this.makeBinary(operator, left, this.parseBitwiseAnd());
    }
    return left;
  }

  private parseBitwiseAnd(): ExpressionNode {
    let left = this.parseEquality();
    while (this.check(TokenKind.Ampersand)) {
      const operator = this.advance().value as BinaryOperator;
      left = this.makeBinary(operator, left, this.parseEquality());
    }
    return left;
  }

  private parseEquality(): ExpressionNode {
    let left = this.parseComparison();
    while (this.check(TokenKind.StrictEqual) || this.check(TokenKind.StrictNotEqual)) {
      const operator = this.advance().value as BinaryOperator;
      left = this.makeBinary(operator, left, this.parseComparison());
    }
    return left;
  }

  private parseComparison(): ExpressionNode {
    let left = this.parseShift();
    while (
      this.check(TokenKind.GreaterThan) || this.check(TokenKind.LessThan) ||
      this.check(TokenKind.GreaterThanOrEqual) || this.check(TokenKind.LessThanOrEqual)
    ) {
      const operator = this.advance().value as BinaryOperator;
      left = this.makeBinary(operator, left, this.parseShift());
    }
    return left;
  }

  private parseShift(): ExpressionNode {
    let left = this.parseAdditive();
    while (this.check(TokenKind.ShiftLeft) || this.check(TokenKind.ShiftRight)) {
      const operator = this.advance().value as BinaryOperator;
      left = this.makeBinary(operator, left, this.parseAdditive());
    }
    return left;
  }

  private parseAdditive(): ExpressionNode {
    let left = this.parseMultiplicative();
    while (this.check(TokenKind.Plus) || this.check(TokenKind.Minus)) {
      const operator = this.advance().value as BinaryOperator;
      left = this.makeBinary(operator, left, this.parseMultiplicative());
    }
    return left;
  }

  private parseMultiplicative(): ExpressionNode {
    let left = this.parseUnary();
    while (this.check(TokenKind.Star)) {
      const operator = this.advance().value as BinaryOperator;
      left = this.makeBinary(operator, left, this.parseUnary());
    }
    return left;
  }

  private parseUnary(): ExpressionNode {
    if (this.check(TokenKind.Tilde)) {
      const location = this.currentLocation();
      this.advance();
      return { kind: AstNodeKind.UnaryExpression, operator: '~', operand: this.parseUnary(), location };
    }
    if (this.check(TokenKind.Minus)) {
      const location = this.currentLocation();
      this.advance();
      return { kind: AstNodeKind.UnaryExpression, operator: '-', operand: this.parseUnary(), location };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode {
    const token = this.currentToken();
    const location = this.currentLocation();

    switch (token.kind) {
      case TokenKind.NumberLiteral: {
        this.advance();
        return this.wrapArrayAccess({
          kind: AstNodeKind.NumberLiteral, value: parseInt(token.value, 10), raw: token.value, location,
        });
      }
      case TokenKind.HexLiteral: {
        this.advance();
        return { kind: AstNodeKind.HexLiteral, value: parseInt(token.value, 16), raw: token.value, location };
      }
      case TokenKind.BinaryLiteral: {
        this.advance();
        return { kind: AstNodeKind.BinaryLiteral, value: parseInt(token.value, 2), raw: token.value, location };
      }
      case TokenKind.BooleanLiteral: {
        this.advance();
        return { kind: AstNodeKind.BooleanLiteral, value: token.value === 'true', location };
      }
      case TokenKind.Identifier: {
        this.advance();
        return this.wrapArrayAccess({ kind: AstNodeKind.Identifier, name: token.value, location });
      }
      case TokenKind.LeftParen: {
        this.advance();
        const expression = this.parseExpression();
        this.expect(TokenKind.RightParen, ')');
        return this.wrapArrayAccess(expression);
      }
      case TokenKind.LeftBracket:
        return this.parseArrayLiteral();
      default:
        throw parserError(`Unexpected token "${token.value}"`, location);
    }
  }

  // Wrap an expression in ArrayAccess if followed by '['.
  private wrapArrayAccess(expression: ExpressionNode): ExpressionNode {
    if (!this.check(TokenKind.LeftBracket)) return expression;
    if (expression.kind !== AstNodeKind.Identifier) return expression;
    this.advance();
    const index = this.parseExpression();
    this.expect(TokenKind.RightBracket, ']');
    return { kind: AstNodeKind.ArrayAccess, array: expression as IdentifierNode, index, location: expression.location };
  }

  private parseArrayLiteral(): ArrayLiteralNode {
    const location = this.currentLocation();
    this.expect(TokenKind.LeftBracket, '[');
    const elements: ExpressionNode[] = [];
    if (!this.check(TokenKind.RightBracket)) {
      elements.push(this.parseExpression());
      while (this.check(TokenKind.Comma)) {
        this.advance();
        if (this.check(TokenKind.RightBracket)) break;
        elements.push(this.parseExpression());
      }
    }
    this.expect(TokenKind.RightBracket, ']');
    return { kind: AstNodeKind.ArrayLiteral, elements, location };
  }

  private makeBinary(operator: BinaryOperator, left: ExpressionNode, right: ExpressionNode): BinaryExpressionNode {
    return { kind: AstNodeKind.BinaryExpression, operator, left, right, location: left.location };
  }
}
