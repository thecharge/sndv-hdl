// Parser: recursive descent parser building an AST from a token stream.

import { Token, TokenKind } from '../lexer/token';
import { parserError } from '../errors/compiler-error';
import {
  ProgramNode, FunctionDeclarationNode, ParameterNode, BlockNode,
  VariableDeclarationNode, ReturnStatementNode, IfStatementNode,
  ExpressionStatementNode, StatementNode,
  TypeAnnotationNode, AstNodeKind, TypeName,
} from './ast';
import { ExpressionParser } from './expression-parser';

export class Parser extends ExpressionParser {

  constructor(tokens: Token[]) {
    super(tokens);
  }

  /**
   * Parse all tokens into a ProgramNode AST root.
   * @returns The root AST node containing all function declarations.
   * @example
   *   const ast = new Parser(tokens).parse();
   */
  parse(): ProgramNode {
    const body: FunctionDeclarationNode[] = [];
    while (!this.isAtEnd()) {
      body.push(this.parseFunctionDeclaration());
    }
    return { kind: AstNodeKind.Program, body, location: { line: 1, column: 1 } };
  }

  private parseFunctionDeclaration(): FunctionDeclarationNode {
    const location = this.currentLocation();
    let is_exported = false;
    if (this.check(TokenKind.Export)) {
      this.advance();
      is_exported = true;
    }
    this.expect(TokenKind.Function, 'function');
    const name = this.expect(TokenKind.Identifier, 'function name').value;
    this.expect(TokenKind.LeftParen, '(');
    const parameters = this.parseParameterList();
    this.expect(TokenKind.RightParen, ')');

    let return_type: TypeAnnotationNode | null = null;
    if (this.check(TokenKind.Colon)) {
      this.advance();
      return_type = this.parseTypeAnnotation();
    }
    const body = this.parseBlock();
    return { kind: AstNodeKind.FunctionDeclaration, name, parameters, return_type, body, is_exported, location };
  }

  private parseParameterList(): ParameterNode[] {
    const parameters: ParameterNode[] = [];
    if (this.check(TokenKind.RightParen)) return parameters;
    parameters.push(this.parseParameter());
    while (this.check(TokenKind.Comma)) {
      this.advance();
      parameters.push(this.parseParameter());
    }
    return parameters;
  }

  private parseParameter(): ParameterNode {
    const location = this.currentLocation();
    const name = this.expect(TokenKind.Identifier, 'parameter name').value;
    this.expect(TokenKind.Colon, ':');
    const type_annotation = this.parseTypeAnnotation();
    return { kind: AstNodeKind.Parameter, name, type_annotation, location };
  }

  private parseTypeAnnotation(): TypeAnnotationNode {
    const location = this.currentLocation();
    const type_token = this.advance();
    let type_name: TypeName;
    if (type_token.kind === TokenKind.NumberType) {
      type_name = TypeName.Number;
    } else if (type_token.kind === TokenKind.BooleanType) {
      type_name = TypeName.Boolean;
    } else {
      throw parserError(`Expected type but found "${type_token.value}"`, location);
    }
    if (this.check(TokenKind.LeftBracket)) {
      this.advance();
      let array_size: number | undefined;
      if (this.check(TokenKind.NumberLiteral)) {
        array_size = parseInt(this.advance().value, 10);
      }
      this.expect(TokenKind.RightBracket, ']');
      type_name = type_name === TypeName.Number ? TypeName.NumberArray : TypeName.BooleanArray;
      return { kind: AstNodeKind.TypeAnnotation, type_name, array_size, location };
    }
    return { kind: AstNodeKind.TypeAnnotation, type_name, location };
  }

  private parseBlock(): BlockNode {
    const location = this.currentLocation();
    this.expect(TokenKind.LeftBrace, '{');
    const statements: StatementNode[] = [];
    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    this.expect(TokenKind.RightBrace, '}');
    return { kind: AstNodeKind.Block, statements, location };
  }

  private parseStatement(): StatementNode {
    if (this.check(TokenKind.Const) || this.check(TokenKind.Let)) return this.parseVariableDeclaration();
    if (this.check(TokenKind.Return)) return this.parseReturnStatement();
    if (this.check(TokenKind.If)) return this.parseIfStatement();
    return this.parseExpressionStatement();
  }

  private parseVariableDeclaration(): VariableDeclarationNode {
    const location = this.currentLocation();
    const is_const = this.advance().kind === TokenKind.Const;
    const name = this.expect(TokenKind.Identifier, 'variable name').value;
    let type_annotation: TypeAnnotationNode | null = null;
    if (this.check(TokenKind.Colon)) {
      this.advance();
      type_annotation = this.parseTypeAnnotation();
    }
    this.expect(TokenKind.Equals, '=');
    const initializer = this.parseExpression();
    this.expect(TokenKind.Semicolon, ';');
    return { kind: AstNodeKind.VariableDeclaration, name, is_const, type_annotation, initializer, location };
  }

  private parseReturnStatement(): ReturnStatementNode {
    const location = this.currentLocation();
    this.advance();
    const expression = this.parseExpression();
    this.expect(TokenKind.Semicolon, ';');
    return { kind: AstNodeKind.ReturnStatement, expression, location };
  }

  private parseIfStatement(): IfStatementNode {
    const location = this.currentLocation();
    this.advance();
    this.expect(TokenKind.LeftParen, '(');
    const condition = this.parseExpression();
    this.expect(TokenKind.RightParen, ')');
    const consequent = this.parseBlock();
    let alternate: BlockNode | IfStatementNode | null = null;
    if (this.check(TokenKind.Else)) {
      this.advance();
      alternate = this.check(TokenKind.If) ? this.parseIfStatement() : this.parseBlock();
    }
    return { kind: AstNodeKind.IfStatement, condition, consequent, alternate, location };
  }

  private parseExpressionStatement(): ExpressionStatementNode {
    const location = this.currentLocation();
    const expression = this.parseExpression();
    this.expect(TokenKind.Semicolon, ';');
    return { kind: AstNodeKind.ExpressionStatement, expression, location };
  }
}
