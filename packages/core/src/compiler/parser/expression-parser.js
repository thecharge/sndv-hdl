"use strict";
// Expression parser: precedence climbing for all TS expression types.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressionParser = void 0;
const token_1 = require("../lexer/token");
const compiler_error_1 = require("../errors/compiler-error");
const ast_1 = require("./ast");
const token_reader_1 = require("./token-reader");
class ExpressionParser extends token_reader_1.TokenReader {
    parseExpression() {
        return this.parseAssignment();
    }
    parseAssignment() {
        const expression = this.parseBitwiseOr();
        if (!this.check(token_1.TokenKind.Equals))
            return expression;
        this.advance();
        const value = this.parseAssignment();
        if (expression.kind !== ast_1.AstNodeKind.Identifier && expression.kind !== ast_1.AstNodeKind.ArrayAccess) {
            throw (0, compiler_error_1.parserError)('Invalid assignment target', expression.location);
        }
        return {
            kind: ast_1.AstNodeKind.AssignmentExpression,
            target: expression,
            value,
            location: expression.location,
        };
    }
    parseBitwiseOr() {
        let left = this.parseBitwiseXor();
        while (this.check(token_1.TokenKind.Pipe)) {
            const operator = this.advance().value;
            left = this.makeBinary(operator, left, this.parseBitwiseXor());
        }
        return left;
    }
    parseBitwiseXor() {
        let left = this.parseBitwiseAnd();
        while (this.check(token_1.TokenKind.Caret)) {
            const operator = this.advance().value;
            left = this.makeBinary(operator, left, this.parseBitwiseAnd());
        }
        return left;
    }
    parseBitwiseAnd() {
        let left = this.parseEquality();
        while (this.check(token_1.TokenKind.Ampersand)) {
            const operator = this.advance().value;
            left = this.makeBinary(operator, left, this.parseEquality());
        }
        return left;
    }
    parseEquality() {
        let left = this.parseComparison();
        while (this.check(token_1.TokenKind.StrictEqual) || this.check(token_1.TokenKind.StrictNotEqual)) {
            const operator = this.advance().value;
            left = this.makeBinary(operator, left, this.parseComparison());
        }
        return left;
    }
    parseComparison() {
        let left = this.parseShift();
        while (this.check(token_1.TokenKind.GreaterThan) || this.check(token_1.TokenKind.LessThan) ||
            this.check(token_1.TokenKind.GreaterThanOrEqual) || this.check(token_1.TokenKind.LessThanOrEqual)) {
            const operator = this.advance().value;
            left = this.makeBinary(operator, left, this.parseShift());
        }
        return left;
    }
    parseShift() {
        let left = this.parseAdditive();
        while (this.check(token_1.TokenKind.ShiftLeft) ||
            this.check(token_1.TokenKind.ShiftRight) ||
            this.check(token_1.TokenKind.ArithmeticShiftRight)) {
            const operator = this.advance().value;
            left = this.makeBinary(operator, left, this.parseAdditive());
        }
        return left;
    }
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (this.check(token_1.TokenKind.Plus) || this.check(token_1.TokenKind.Minus)) {
            const operator = this.advance().value;
            left = this.makeBinary(operator, left, this.parseMultiplicative());
        }
        return left;
    }
    parseMultiplicative() {
        let left = this.parseUnary();
        while (this.check(token_1.TokenKind.Star)) {
            const operator = this.advance().value;
            left = this.makeBinary(operator, left, this.parseUnary());
        }
        return left;
    }
    parseUnary() {
        if (this.check(token_1.TokenKind.Tilde)) {
            const location = this.currentLocation();
            this.advance();
            return { kind: ast_1.AstNodeKind.UnaryExpression, operator: '~', operand: this.parseUnary(), location };
        }
        if (this.check(token_1.TokenKind.Minus)) {
            const location = this.currentLocation();
            this.advance();
            return { kind: ast_1.AstNodeKind.UnaryExpression, operator: '-', operand: this.parseUnary(), location };
        }
        if (this.check(token_1.TokenKind.Not)) {
            const location = this.currentLocation();
            this.advance();
            return { kind: ast_1.AstNodeKind.UnaryExpression, operator: '!', operand: this.parseUnary(), location };
        }
        return this.parsePrimary();
    }
    parsePrimary() {
        const token = this.currentToken();
        const location = this.currentLocation();
        switch (token.kind) {
            case token_1.TokenKind.NumberLiteral: {
                this.advance();
                return this.wrapArrayAccess({
                    kind: ast_1.AstNodeKind.NumberLiteral, value: parseInt(token.value, 10), raw: token.value, location,
                });
            }
            case token_1.TokenKind.HexLiteral: {
                this.advance();
                return { kind: ast_1.AstNodeKind.HexLiteral, value: parseInt(token.value, 16), raw: token.value, location };
            }
            case token_1.TokenKind.BinaryLiteral: {
                this.advance();
                return { kind: ast_1.AstNodeKind.BinaryLiteral, value: parseInt(token.value, 2), raw: token.value, location };
            }
            case token_1.TokenKind.BooleanLiteral: {
                this.advance();
                return { kind: ast_1.AstNodeKind.BooleanLiteral, value: token.value === 'true', location };
            }
            case token_1.TokenKind.Identifier: {
                this.advance();
                if (token.value === 'Bits' && this.check(token_1.TokenKind.Dot)) {
                    return this.parseBitsIntrinsic(location);
                }
                return this.wrapArrayAccess({ kind: ast_1.AstNodeKind.Identifier, name: token.value, location });
            }
            case token_1.TokenKind.LeftParen: {
                this.advance();
                const expression = this.parseExpression();
                this.expect(token_1.TokenKind.RightParen, ')');
                return this.wrapArrayAccess(expression);
            }
            case token_1.TokenKind.LeftBracket:
                return this.parseArrayLiteral();
            default:
                throw (0, compiler_error_1.parserError)(`Unexpected token "${token.value}"`, location);
        }
    }
    parseBitsIntrinsic(location) {
        this.advance();
        if (!this.check(token_1.TokenKind.Identifier)) {
            throw (0, compiler_error_1.parserError)('Expected "slice" or "bit" after Bits.', location);
        }
        const method_name = this.advance().value;
        this.expect(token_1.TokenKind.LeftParen, '(');
        const source = this.parseExpression();
        this.expect(token_1.TokenKind.Comma, ',');
        if (method_name === 'slice') {
            const msb = this.parseExpression();
            this.expect(token_1.TokenKind.Comma, ',');
            const lsb = this.parseExpression();
            this.expect(token_1.TokenKind.RightParen, ')');
            return { kind: ast_1.AstNodeKind.SliceAccess, source, msb, lsb, location };
        }
        else if (method_name === 'bit') {
            const idx = this.parseExpression();
            this.expect(token_1.TokenKind.RightParen, ')');
            if (source.kind !== ast_1.AstNodeKind.Identifier) {
                throw (0, compiler_error_1.parserError)('Bits.bit() source must be a simple identifier', location);
            }
            return { kind: ast_1.AstNodeKind.ArrayAccess, array: source, index: idx, location };
        }
        else {
            throw (0, compiler_error_1.parserError)(`Unknown Bits intrinsic "${method_name}". Use Bits.slice or Bits.bit.`, location);
        }
    }
    // Wrap an expression in ArrayAccess if followed by '['.
    wrapArrayAccess(expression) {
        if (!this.check(token_1.TokenKind.LeftBracket))
            return expression;
        if (expression.kind !== ast_1.AstNodeKind.Identifier)
            return expression;
        this.advance();
        const index = this.parseExpression();
        this.expect(token_1.TokenKind.RightBracket, ']');
        return { kind: ast_1.AstNodeKind.ArrayAccess, array: expression, index, location: expression.location };
    }
    parseArrayLiteral() {
        const location = this.currentLocation();
        this.expect(token_1.TokenKind.LeftBracket, '[');
        const elements = [];
        if (!this.check(token_1.TokenKind.RightBracket)) {
            elements.push(this.parseExpression());
            while (this.check(token_1.TokenKind.Comma)) {
                this.advance();
                if (this.check(token_1.TokenKind.RightBracket))
                    break;
                elements.push(this.parseExpression());
            }
        }
        this.expect(token_1.TokenKind.RightBracket, ']');
        return { kind: ast_1.AstNodeKind.ArrayLiteral, elements, location };
    }
    makeBinary(operator, left, right) {
        return { kind: ast_1.AstNodeKind.BinaryExpression, operator, left, right, location: left.location };
    }
}
exports.ExpressionParser = ExpressionParser;
//# sourceMappingURL=expression-parser.js.map