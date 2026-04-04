"use strict";
// Parser: recursive descent parser building an AST from a token stream.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const token_1 = require("../lexer/token");
const compiler_error_1 = require("../errors/compiler-error");
const ast_1 = require("./ast");
const expression_parser_1 = require("./expression-parser");
class Parser extends expression_parser_1.ExpressionParser {
    constructor(tokens) {
        super(tokens);
    }
    /**
     * Parse all tokens into a ProgramNode AST root.
     * @returns The root AST node containing all function declarations.
     * @example
     *   const ast = new Parser(tokens).parse();
     */
    parse() {
        const body = [];
        while (!this.isAtEnd()) {
            body.push(this.parseFunctionDeclaration());
        }
        return { kind: ast_1.AstNodeKind.Program, body, location: { line: 1, column: 1 } };
    }
    parseFunctionDeclaration() {
        const location = this.currentLocation();
        let is_exported = false;
        if (this.check(token_1.TokenKind.Export)) {
            this.advance();
            is_exported = true;
        }
        this.expect(token_1.TokenKind.Function, 'function');
        const name = this.expect(token_1.TokenKind.Identifier, 'function name').value;
        this.expect(token_1.TokenKind.LeftParen, '(');
        const parameters = this.parseParameterList();
        this.expect(token_1.TokenKind.RightParen, ')');
        let return_type = null;
        if (this.check(token_1.TokenKind.Colon)) {
            this.advance();
            return_type = this.parseTypeAnnotation();
        }
        const body = this.parseBlock();
        return { kind: ast_1.AstNodeKind.FunctionDeclaration, name, parameters, return_type, body, is_exported, location };
    }
    parseParameterList() {
        const parameters = [];
        if (this.check(token_1.TokenKind.RightParen))
            return parameters;
        parameters.push(this.parseParameter());
        while (this.check(token_1.TokenKind.Comma)) {
            this.advance();
            parameters.push(this.parseParameter());
        }
        return parameters;
    }
    parseParameter() {
        const location = this.currentLocation();
        const name = this.expect(token_1.TokenKind.Identifier, 'parameter name').value;
        this.expect(token_1.TokenKind.Colon, ':');
        const type_annotation = this.parseTypeAnnotation();
        return { kind: ast_1.AstNodeKind.Parameter, name, type_annotation, location };
    }
    parseTypeAnnotation() {
        const location = this.currentLocation();
        const type_token = this.advance();
        let type_name;
        if (type_token.kind === token_1.TokenKind.NumberType) {
            type_name = ast_1.TypeName.Number;
        }
        else if (type_token.kind === token_1.TokenKind.BooleanType) {
            type_name = ast_1.TypeName.Boolean;
        }
        else {
            throw (0, compiler_error_1.parserError)(`Expected type but found "${type_token.value}"`, location);
        }
        if (this.check(token_1.TokenKind.LeftBracket)) {
            this.advance();
            let array_size;
            if (this.check(token_1.TokenKind.NumberLiteral)) {
                array_size = parseInt(this.advance().value, 10);
            }
            this.expect(token_1.TokenKind.RightBracket, ']');
            type_name = type_name === ast_1.TypeName.Number ? ast_1.TypeName.NumberArray : ast_1.TypeName.BooleanArray;
            return { kind: ast_1.AstNodeKind.TypeAnnotation, type_name, array_size, location };
        }
        return { kind: ast_1.AstNodeKind.TypeAnnotation, type_name, location };
    }
    parseBlock() {
        const location = this.currentLocation();
        this.expect(token_1.TokenKind.LeftBrace, '{');
        const statements = [];
        while (!this.check(token_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            statements.push(this.parseStatement());
        }
        this.expect(token_1.TokenKind.RightBrace, '}');
        return { kind: ast_1.AstNodeKind.Block, statements, location };
    }
    parseStatement() {
        if (this.check(token_1.TokenKind.Const) || this.check(token_1.TokenKind.Let))
            return this.parseVariableDeclaration();
        if (this.check(token_1.TokenKind.Return))
            return this.parseReturnStatement();
        if (this.check(token_1.TokenKind.If))
            return this.parseIfStatement();
        return this.parseExpressionStatement();
    }
    parseVariableDeclaration() {
        const location = this.currentLocation();
        const is_const = this.advance().kind === token_1.TokenKind.Const;
        const name = this.expect(token_1.TokenKind.Identifier, 'variable name').value;
        let type_annotation = null;
        if (this.check(token_1.TokenKind.Colon)) {
            this.advance();
            type_annotation = this.parseTypeAnnotation();
        }
        this.expect(token_1.TokenKind.Equals, '=');
        const initializer = this.parseExpression();
        this.expect(token_1.TokenKind.Semicolon, ';');
        return { kind: ast_1.AstNodeKind.VariableDeclaration, name, is_const, type_annotation, initializer, location };
    }
    parseReturnStatement() {
        const location = this.currentLocation();
        this.advance();
        const expression = this.parseExpression();
        this.expect(token_1.TokenKind.Semicolon, ';');
        return { kind: ast_1.AstNodeKind.ReturnStatement, expression, location };
    }
    parseIfStatement() {
        const location = this.currentLocation();
        this.advance();
        this.expect(token_1.TokenKind.LeftParen, '(');
        const condition = this.parseExpression();
        this.expect(token_1.TokenKind.RightParen, ')');
        const consequent = this.parseBlock();
        let alternate = null;
        if (this.check(token_1.TokenKind.Else)) {
            this.advance();
            alternate = this.check(token_1.TokenKind.If) ? this.parseIfStatement() : this.parseBlock();
        }
        return { kind: ast_1.AstNodeKind.IfStatement, condition, consequent, alternate, location };
    }
    parseExpressionStatement() {
        const location = this.currentLocation();
        const expression = this.parseExpression();
        this.expect(token_1.TokenKind.Semicolon, ';');
        return { kind: ast_1.AstNodeKind.ExpressionStatement, expression, location };
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map