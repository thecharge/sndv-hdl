"use strict";
// Token classification for the TypeScript subset lexer.
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYWORD_TOKEN_MAP = exports.TokenKind = void 0;
var TokenKind;
(function (TokenKind) {
    // Literals
    TokenKind["NumberLiteral"] = "NumberLiteral";
    TokenKind["HexLiteral"] = "HexLiteral";
    TokenKind["BinaryLiteral"] = "BinaryLiteral";
    TokenKind["BooleanLiteral"] = "BooleanLiteral";
    TokenKind["StringLiteral"] = "StringLiteral";
    // Identifiers and keywords
    TokenKind["Identifier"] = "Identifier";
    TokenKind["Const"] = "Const";
    TokenKind["Let"] = "Let";
    TokenKind["Function"] = "Function";
    TokenKind["Return"] = "Return";
    TokenKind["If"] = "If";
    TokenKind["Else"] = "Else";
    TokenKind["Export"] = "Export";
    // Type keywords
    TokenKind["NumberType"] = "NumberType";
    TokenKind["BooleanType"] = "BooleanType";
    // Operators - arithmetic
    TokenKind["Plus"] = "Plus";
    TokenKind["Minus"] = "Minus";
    TokenKind["Star"] = "Star";
    TokenKind["Tilde"] = "Tilde";
    // Operators - bitwise
    TokenKind["Ampersand"] = "Ampersand";
    TokenKind["Pipe"] = "Pipe";
    TokenKind["Caret"] = "Caret";
    TokenKind["ShiftLeft"] = "ShiftLeft";
    TokenKind["ShiftRight"] = "ShiftRight";
    TokenKind["ArithmeticShiftRight"] = "ArithmeticShiftRight";
    // Operators - comparison
    TokenKind["StrictEqual"] = "StrictEqual";
    TokenKind["StrictNotEqual"] = "StrictNotEqual";
    TokenKind["GreaterThan"] = "GreaterThan";
    TokenKind["LessThan"] = "LessThan";
    TokenKind["GreaterThanOrEqual"] = "GreaterThanOrEqual";
    TokenKind["LessThanOrEqual"] = "LessThanOrEqual";
    // Assignment
    TokenKind["Equals"] = "Equals";
    // Punctuation
    TokenKind["LeftParen"] = "LeftParen";
    TokenKind["RightParen"] = "RightParen";
    TokenKind["LeftBrace"] = "LeftBrace";
    TokenKind["RightBrace"] = "RightBrace";
    TokenKind["LeftBracket"] = "LeftBracket";
    TokenKind["RightBracket"] = "RightBracket";
    TokenKind["Colon"] = "Colon";
    TokenKind["Semicolon"] = "Semicolon";
    TokenKind["Comma"] = "Comma";
    // Class-related keywords
    TokenKind["Class"] = "Class";
    TokenKind["This"] = "This";
    TokenKind["Switch"] = "Switch";
    TokenKind["Case"] = "Case";
    TokenKind["Default"] = "Default";
    TokenKind["Break"] = "Break";
    TokenKind["Enum"] = "Enum";
    TokenKind["Private"] = "Private";
    TokenKind["Public"] = "Public";
    TokenKind["Extends"] = "Extends";
    TokenKind["New"] = "New";
    TokenKind["Async"] = "Async";
    TokenKind["While"] = "While";
    // Decorators & member access
    TokenKind["At"] = "At";
    TokenKind["Dot"] = "Dot";
    // Compound assignment
    TokenKind["PlusPlus"] = "PlusPlus";
    TokenKind["MinusMinus"] = "MinusMinus";
    TokenKind["PlusEquals"] = "PlusEquals";
    TokenKind["MinusEquals"] = "MinusEquals";
    TokenKind["Not"] = "Not";
    // Special
    TokenKind["EndOfFile"] = "EndOfFile";
})(TokenKind || (exports.TokenKind = TokenKind = {}));
// Map from keyword strings to their token kinds.
exports.KEYWORD_TOKEN_MAP = new Map([
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
//# sourceMappingURL=token.js.map