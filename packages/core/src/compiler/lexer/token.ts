// Token classification for the TypeScript subset lexer.

export enum TokenKind {
  // Literals
  NumberLiteral = 'NumberLiteral',
  HexLiteral = 'HexLiteral',
  BinaryLiteral = 'BinaryLiteral',
  BooleanLiteral = 'BooleanLiteral',
  StringLiteral = 'StringLiteral',

  // Identifiers and keywords
  Identifier = 'Identifier',
  Const = 'Const',
  Let = 'Let',
  Function = 'Function',
  Return = 'Return',
  If = 'If',
  Else = 'Else',
  Export = 'Export',

  // Type keywords
  NumberType = 'NumberType',
  BooleanType = 'BooleanType',

  // Operators - arithmetic
  Plus = 'Plus',
  Minus = 'Minus',
  Star = 'Star',
  Tilde = 'Tilde',

  // Operators - bitwise
  Ampersand = 'Ampersand',
  Pipe = 'Pipe',
  Caret = 'Caret',
  ShiftLeft = 'ShiftLeft',
  ShiftRight = 'ShiftRight',
  ArithmeticShiftRight = 'ArithmeticShiftRight',

  // Operators - comparison
  StrictEqual = 'StrictEqual',
  StrictNotEqual = 'StrictNotEqual',
  GreaterThan = 'GreaterThan',
  LessThan = 'LessThan',
  GreaterThanOrEqual = 'GreaterThanOrEqual',
  LessThanOrEqual = 'LessThanOrEqual',

  // Assignment
  Equals = 'Equals',

  // Punctuation
  LeftParen = 'LeftParen',
  RightParen = 'RightParen',
  LeftBrace = 'LeftBrace',
  RightBrace = 'RightBrace',
  LeftBracket = 'LeftBracket',
  RightBracket = 'RightBracket',
  Colon = 'Colon',
  Semicolon = 'Semicolon',
  Comma = 'Comma',

  // Class-related keywords
  Class = 'Class',
  This = 'This',
  Switch = 'Switch',
  Case = 'Case',
  Default = 'Default',
  Break = 'Break',
  Enum = 'Enum',
  Private = 'Private',
  Public = 'Public',
  Extends = 'Extends',
  New = 'New',
  Async = 'Async',
  While = 'While',

  // Decorators & member access
  At = 'At',
  Dot = 'Dot',

  // Compound assignment
  PlusPlus = 'PlusPlus',
  MinusMinus = 'MinusMinus',
  PlusEquals = 'PlusEquals',
  MinusEquals = 'MinusEquals',
  Not = 'Not',

  // Special
  EndOfFile = 'EndOfFile',
}

// Single token produced by the lexer.
export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  readonly line: number;
  readonly column: number;
}

// Map from keyword strings to their token kinds.
export const KEYWORD_TOKEN_MAP: ReadonlyMap<string, TokenKind> = new Map([
  ['const', TokenKind.Const],
  ['let', TokenKind.Let],
  ['function', TokenKind.Function],
  ['return', TokenKind.Return],
  ['if', TokenKind.If],
  ['else', TokenKind.Else],
  ['export', TokenKind.Export],
  ['number', TokenKind.NumberType],
  ['boolean', TokenKind.BooleanType],
  ['true', TokenKind.BooleanLiteral],
  ['false', TokenKind.BooleanLiteral],
  ['class', TokenKind.Class],
  ['this', TokenKind.This],
  ['switch', TokenKind.Switch],
  ['case', TokenKind.Case],
  ['default', TokenKind.Default],
  ['break', TokenKind.Break],
  ['enum', TokenKind.Enum],
  ['private', TokenKind.Private],
  ['public', TokenKind.Public],
  ['extends', TokenKind.Extends],
  ['new', TokenKind.New],
  ['async', TokenKind.Async],
  ['while', TokenKind.While],
]);
