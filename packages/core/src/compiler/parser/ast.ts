// Abstract Syntax Tree node definitions for the TypeScript subset.

import { SourceLocation } from '../errors/compiler-error';

// Base interface all AST nodes share.
export interface AstNodeBase {
  readonly kind: AstNodeKind;
  readonly location: SourceLocation;
}

export enum AstNodeKind {
  Program = 'Program',
  FunctionDeclaration = 'FunctionDeclaration',
  Parameter = 'Parameter',
  Block = 'Block',
  VariableDeclaration = 'VariableDeclaration',
  ReturnStatement = 'ReturnStatement',
  IfStatement = 'IfStatement',
  ExpressionStatement = 'ExpressionStatement',
  AssignmentExpression = 'AssignmentExpression',
  BinaryExpression = 'BinaryExpression',
  UnaryExpression = 'UnaryExpression',
  Identifier = 'Identifier',
  NumberLiteral = 'NumberLiteral',
  HexLiteral = 'HexLiteral',
  BinaryLiteral = 'BinaryLiteral',
  BooleanLiteral = 'BooleanLiteral',
  ArrayLiteral = 'ArrayLiteral',
  ArrayAccess = 'ArrayAccess',
  TypeAnnotation = 'TypeAnnotation',
}

// -- Top-level nodes --

export interface ProgramNode extends AstNodeBase {
  kind: AstNodeKind.Program;
  body: FunctionDeclarationNode[];
}

export interface FunctionDeclarationNode extends AstNodeBase {
  kind: AstNodeKind.FunctionDeclaration;
  name: string;
  parameters: ParameterNode[];
  return_type: TypeAnnotationNode | null;
  body: BlockNode;
  is_exported: boolean;
}

export interface ParameterNode extends AstNodeBase {
  kind: AstNodeKind.Parameter;
  name: string;
  type_annotation: TypeAnnotationNode;
}

export interface BlockNode extends AstNodeBase {
  kind: AstNodeKind.Block;
  statements: StatementNode[];
}

// -- Type annotation --

export enum TypeName {
  Number = 'number',
  Boolean = 'boolean',
  NumberArray = 'number[]',
  BooleanArray = 'boolean[]',
}

export interface TypeAnnotationNode extends AstNodeBase {
  kind: AstNodeKind.TypeAnnotation;
  type_name: TypeName;
  array_size?: number;
}

// -- Statements --

export interface VariableDeclarationNode extends AstNodeBase {
  kind: AstNodeKind.VariableDeclaration;
  name: string;
  is_const: boolean;
  type_annotation: TypeAnnotationNode | null;
  initializer: ExpressionNode;
}

export interface ReturnStatementNode extends AstNodeBase {
  kind: AstNodeKind.ReturnStatement;
  expression: ExpressionNode;
}

export interface IfStatementNode extends AstNodeBase {
  kind: AstNodeKind.IfStatement;
  condition: ExpressionNode;
  consequent: BlockNode;
  alternate: BlockNode | IfStatementNode | null;
}

export interface ExpressionStatementNode extends AstNodeBase {
  kind: AstNodeKind.ExpressionStatement;
  expression: ExpressionNode;
}

export type StatementNode =
  | VariableDeclarationNode
  | ReturnStatementNode
  | IfStatementNode
  | ExpressionStatementNode;

// -- Expressions --

export type BinaryOperator =
  | '+' | '-' | '*'
  | '&' | '|' | '^' | '>>' | '>>>' | '<<'
  | '===' | '!==' | '>' | '<' | '>=' | '<=';

export type UnaryOperator = '~' | '-' | '!';

export interface AssignmentExpressionNode extends AstNodeBase {
  kind: AstNodeKind.AssignmentExpression;
  target: IdentifierNode | ArrayAccessNode;
  value: ExpressionNode;
}

export interface BinaryExpressionNode extends AstNodeBase {
  kind: AstNodeKind.BinaryExpression;
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryExpressionNode extends AstNodeBase {
  kind: AstNodeKind.UnaryExpression;
  operator: UnaryOperator;
  operand: ExpressionNode;
}

export interface IdentifierNode extends AstNodeBase {
  kind: AstNodeKind.Identifier;
  name: string;
}

export interface NumberLiteralNode extends AstNodeBase {
  kind: AstNodeKind.NumberLiteral;
  value: number;
  raw: string;
}

export interface HexLiteralNode extends AstNodeBase {
  kind: AstNodeKind.HexLiteral;
  value: number;
  raw: string;
}

export interface BinaryLiteralNode extends AstNodeBase {
  kind: AstNodeKind.BinaryLiteral;
  value: number;
  raw: string;
}

export interface BooleanLiteralNode extends AstNodeBase {
  kind: AstNodeKind.BooleanLiteral;
  value: boolean;
}

export interface ArrayLiteralNode extends AstNodeBase {
  kind: AstNodeKind.ArrayLiteral;
  elements: ExpressionNode[];
}

export interface ArrayAccessNode extends AstNodeBase {
  kind: AstNodeKind.ArrayAccess;
  array: IdentifierNode;
  index: ExpressionNode;
}

export type ExpressionNode =
  | AssignmentExpressionNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | IdentifierNode
  | NumberLiteralNode
  | HexLiteralNode
  | BinaryLiteralNode
  | BooleanLiteralNode
  | ArrayLiteralNode
  | ArrayAccessNode;
