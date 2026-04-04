"use strict";
// Statement-level parser: if/switch/while/return/var/assign expressions.
// Extends ClassDeclParser; used as middle layer in the inheritance chain.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassStmtParser = void 0;
const token_1 = require("../lexer/token");
const class_decl_parser_1 = require("./class-decl-parser");
class ClassStmtParser extends class_decl_parser_1.ClassDeclParser {
    parseStatement() {
        if (this.checkValue('await')) {
            this.advance();
            const signal = this.collectUntilSemicolon();
            if (this.check(token_1.TokenKind.Semicolon))
                this.advance();
            return { kind: 'await', signal };
        }
        if (this.check(token_1.TokenKind.If))
            return this.parseIf();
        if (this.check(token_1.TokenKind.Switch))
            return this.parseSwitch();
        if (this.check(token_1.TokenKind.While))
            return this.parseWhile();
        if (this.check(token_1.TokenKind.Return))
            return this.parseReturn();
        if (this.check(token_1.TokenKind.Const) || this.check(token_1.TokenKind.Let))
            return this.parseVarDecl();
        if (this.check(token_1.TokenKind.Break)) {
            this.advance();
            if (this.check(token_1.TokenKind.Semicolon))
                this.advance();
            return null;
        }
        if (this.checkValue('Assert') && this.peekAhead(1)?.kind === token_1.TokenKind.LeftParen) {
            this.advance();
            this.expect(token_1.TokenKind.LeftParen);
            const inner = this.collectBalanced(token_1.TokenKind.LeftParen, token_1.TokenKind.RightParen);
            this.expect(token_1.TokenKind.RightParen);
            if (this.check(token_1.TokenKind.Semicolon))
                this.advance();
            let condition = inner;
            let message = null;
            let depth = 0;
            for (let i = 0; i < inner.length; i++) {
                if (inner[i] === '(' || inner[i] === '[')
                    depth++;
                if (inner[i] === ')' || inner[i] === ']')
                    depth--;
                if (depth === 0 && inner[i] === ',') {
                    condition = inner.substring(0, i).trim();
                    message = inner.substring(i + 1).trim().replace(/^["']|["']$/g, '');
                    break;
                }
            }
            return { kind: 'assert', condition, message };
        }
        return this.parseAssignOrExpr();
    }
    parseStatements() {
        const stmts = [];
        while (!this.check(token_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            const stmt = this.parseStatement();
            if (stmt)
                stmts.push(stmt);
        }
        return stmts;
    }
    parseIf() {
        this.expect(token_1.TokenKind.If);
        this.expect(token_1.TokenKind.LeftParen);
        const condition = this.collectBalanced(token_1.TokenKind.LeftParen, token_1.TokenKind.RightParen);
        this.expect(token_1.TokenKind.RightParen);
        const then_body = this.parseStatementBlockOrSingle();
        let else_body = null;
        if (this.check(token_1.TokenKind.Else)) {
            this.advance();
            else_body = this.check(token_1.TokenKind.If) ? [this.parseIf()] : this.parseStatementBlockOrSingle();
        }
        return { kind: 'if', condition, then_body, else_body };
    }
    parseStatementBlockOrSingle() {
        if (this.check(token_1.TokenKind.LeftBrace)) {
            this.advance();
            const body = this.parseStatements();
            this.expect(token_1.TokenKind.RightBrace);
            return body;
        }
        const stmt = this.parseStatement();
        return stmt ? [stmt] : [];
    }
    parseSwitch() {
        this.expect(token_1.TokenKind.Switch);
        this.expect(token_1.TokenKind.LeftParen);
        const expr = this.collectBalanced(token_1.TokenKind.LeftParen, token_1.TokenKind.RightParen);
        this.expect(token_1.TokenKind.RightParen);
        this.expect(token_1.TokenKind.LeftBrace);
        const cases = [];
        let default_body = null;
        while (!this.check(token_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            if (this.check(token_1.TokenKind.Case)) {
                this.advance();
                let label = '';
                while (!this.check(token_1.TokenKind.Colon) && !this.isAtEnd()) {
                    label += this.advance().value;
                }
                this.expect(token_1.TokenKind.Colon);
                const body = [];
                while (!this.check(token_1.TokenKind.Case) && !this.check(token_1.TokenKind.Default) &&
                    !this.check(token_1.TokenKind.RightBrace) && !this.isAtEnd()) {
                    const s = this.parseStatement();
                    if (s)
                        body.push(s);
                }
                cases.push({ label: label.trim(), body });
            }
            else if (this.check(token_1.TokenKind.Default)) {
                this.advance();
                this.expect(token_1.TokenKind.Colon);
                default_body = [];
                while (!this.check(token_1.TokenKind.Case) && !this.check(token_1.TokenKind.RightBrace) && !this.isAtEnd()) {
                    const s = this.parseStatement();
                    if (s)
                        default_body.push(s);
                }
            }
            else {
                this.advance();
            }
        }
        this.expect(token_1.TokenKind.RightBrace);
        return { kind: 'switch', expr, cases, default_body };
    }
    parseWhile() {
        this.expect(token_1.TokenKind.While);
        this.expect(token_1.TokenKind.LeftParen);
        const condition = this.collectBalanced(token_1.TokenKind.LeftParen, token_1.TokenKind.RightParen);
        this.expect(token_1.TokenKind.RightParen);
        this.expect(token_1.TokenKind.LeftBrace);
        const body = this.parseStatements();
        this.expect(token_1.TokenKind.RightBrace);
        return { kind: 'while', condition, body };
    }
    parseReturn() {
        this.advance();
        let value = null;
        if (!this.check(token_1.TokenKind.Semicolon))
            value = this.collectUntilSemicolon();
        if (this.check(token_1.TokenKind.Semicolon))
            this.advance();
        return { kind: 'return', value };
    }
    parseVarDecl() {
        this.advance(); // consume 'const' or 'let'
        const name = this.advance().value;
        let type = '';
        if (this.check(token_1.TokenKind.Colon)) {
            this.advance();
            while (!this.check(token_1.TokenKind.Equals) && !this.check(token_1.TokenKind.Semicolon) && !this.isAtEnd()) {
                type += this.advance().value;
            }
        }
        this.expect(token_1.TokenKind.Equals);
        const value = this.collectUntilSemicolon();
        if (this.check(token_1.TokenKind.Semicolon))
            this.advance();
        return { kind: 'var', name, type: type.trim(), value };
    }
    // Token-level assignment and expression parser.
    // Handles this.prop = expr, this.prop++/-- and compound assignments.
    // Also handles this.method() calls (stored as CallStmtAST for inlining).
    parseAssignOrExpr() {
        const saved_pos = this.pos;
        if (this.check(token_1.TokenKind.This)) {
            const target_result = this.tryParseAssignTarget();
            if (target_result) {
                const { target } = target_result;
                // this.method() - no-arg helper call for inlining
                if (this.check(token_1.TokenKind.LeftParen)) {
                    this.advance(); // (
                    if (this.check(token_1.TokenKind.RightParen))
                        this.advance(); // )
                    if (this.check(token_1.TokenKind.Semicolon))
                        this.advance();
                    const methodName = target.startsWith('this.') ? target.slice(5) : target;
                    return { kind: 'call', method: methodName };
                }
                if (this.check(token_1.TokenKind.PlusPlus)) {
                    this.advance();
                    if (this.check(token_1.TokenKind.Semicolon))
                        this.advance();
                    return { kind: 'assign', target, value: `${target} + 1` };
                }
                if (this.check(token_1.TokenKind.MinusMinus)) {
                    this.advance();
                    if (this.check(token_1.TokenKind.Semicolon))
                        this.advance();
                    return { kind: 'assign', target, value: `${target} - 1` };
                }
                if (this.check(token_1.TokenKind.Equals)) {
                    this.advance();
                    const value = this.collectUntilSemicolon();
                    if (this.check(token_1.TokenKind.Semicolon))
                        this.advance();
                    return { kind: 'assign', target, value };
                }
                if (this.check(token_1.TokenKind.PlusEquals)) {
                    this.advance();
                    const rhs = this.collectUntilSemicolon();
                    if (this.check(token_1.TokenKind.Semicolon))
                        this.advance();
                    return { kind: 'assign', target, value: `${target} + ${rhs}` };
                }
                if (this.check(token_1.TokenKind.MinusEquals)) {
                    this.advance();
                    const rhs = this.collectUntilSemicolon();
                    if (this.check(token_1.TokenKind.Semicolon))
                        this.advance();
                    return { kind: 'assign', target, value: `${target} - ${rhs}` };
                }
                if ((this.check(token_1.TokenKind.Ampersand) || this.check(token_1.TokenKind.Pipe) || this.check(token_1.TokenKind.Caret)) &&
                    this.peekAhead(1)?.kind === token_1.TokenKind.Equals) {
                    const op = this.advance().value;
                    this.advance(); // consume '='
                    const rhs = this.collectUntilSemicolon();
                    if (this.check(token_1.TokenKind.Semicolon))
                        this.advance();
                    return { kind: 'assign', target, value: `${target} ${op} ${rhs}` };
                }
                this.pos = saved_pos;
            }
            else {
                this.pos = saved_pos;
            }
        }
        // Local variable assignment: IDENTIFIER = expr;
        if (this.check(token_1.TokenKind.Identifier)) {
            const localSavedPos = this.pos;
            const name = this.advance().value;
            if (this.check(token_1.TokenKind.Equals)) {
                this.advance();
                const value = this.collectUntilSemicolon();
                if (this.check(token_1.TokenKind.Semicolon))
                    this.advance();
                return { kind: 'assign', target: name, value };
            }
            this.pos = localSavedPos;
        }
        const text = this.collectUntilSemicolon();
        if (this.check(token_1.TokenKind.Semicolon))
            this.advance();
        return { kind: 'expr', text };
    }
    tryParseAssignTarget() {
        if (!this.check(token_1.TokenKind.This))
            return null;
        this.advance();
        if (!this.check(token_1.TokenKind.Dot))
            return null;
        this.advance();
        if (!this.check(token_1.TokenKind.Identifier))
            return null;
        const prop_name = this.advance().value;
        let target = `this.${prop_name}`;
        if (this.check(token_1.TokenKind.LeftBracket)) {
            this.advance();
            const idx = this.collectBalanced(token_1.TokenKind.LeftBracket, token_1.TokenKind.RightBracket);
            this.expect(token_1.TokenKind.RightBracket);
            target = `this.${prop_name}[${idx}]`;
        }
        return { target };
    }
}
exports.ClassStmtParser = ClassStmtParser;
//# sourceMappingURL=class-stmt-parser.js.map