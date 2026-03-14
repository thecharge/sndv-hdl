// Statement-level parser: if/switch/while/return/var/assign expressions.
// Extends ClassDeclParser; used as middle layer in the inheritance chain.

import { TokenKind } from '../lexer/token';
import {
    StatementAST, IfAST, SwitchAST, WhileAST, ReturnAST, VarDeclAST,
    AssignAST, ExprStmtAST, AssertStmtAST, AwaitAST,
} from './class-module-ast';
import { ClassDeclParser } from './class-decl-parser';

export class ClassStmtParser extends ClassDeclParser {
    protected parseStatement(): StatementAST | null {
        if (this.checkValue('await')) {
            this.advance();
            const signal = this.collectUntilSemicolon();
            if (this.check(TokenKind.Semicolon)) this.advance();
            return { kind: 'await', signal } satisfies AwaitAST;
        }

        if (this.check(TokenKind.If)) return this.parseIf();
        if (this.check(TokenKind.Switch)) return this.parseSwitch();
        if (this.check(TokenKind.While)) return this.parseWhile();
        if (this.check(TokenKind.Return)) return this.parseReturn();
        if (this.check(TokenKind.Const) || this.check(TokenKind.Let)) return this.parseVarDecl();
        if (this.check(TokenKind.Break)) {
            this.advance();
            if (this.check(TokenKind.Semicolon)) this.advance();
            return null;
        }

        if (this.checkValue('Assert') && this.peekAhead(1)?.kind === TokenKind.LeftParen) {
            this.advance();
            this.expect(TokenKind.LeftParen);
            const inner = this.collectBalanced(TokenKind.LeftParen, TokenKind.RightParen);
            this.expect(TokenKind.RightParen);
            if (this.check(TokenKind.Semicolon)) this.advance();

            let condition = inner;
            let message: string | null = null;
            let depth = 0;
            for (let i = 0; i < inner.length; i++) {
                if (inner[i] === '(' || inner[i] === '[') depth++;
                if (inner[i] === ')' || inner[i] === ']') depth--;
                if (depth === 0 && inner[i] === ',') {
                    condition = inner.substring(0, i).trim();
                    message = inner.substring(i + 1).trim().replace(/^["']|["']$/g, '');
                    break;
                }
            }
            return { kind: 'assert' as const, condition, message } satisfies AssertStmtAST;
        }

        return this.parseAssignOrExpr();
    }

    protected parseStatements(): StatementAST[] {
        const stmts: StatementAST[] = [];
        while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
            const stmt = this.parseStatement();
            if (stmt) stmts.push(stmt);
        }
        return stmts;
    }

    protected parseIf(): IfAST {
        this.expect(TokenKind.If);
        this.expect(TokenKind.LeftParen);
        const condition = this.collectBalanced(TokenKind.LeftParen, TokenKind.RightParen);
        this.expect(TokenKind.RightParen);
        const then_body = this.parseStatementBlockOrSingle();
        let else_body: StatementAST[] | null = null;
        if (this.check(TokenKind.Else)) {
            this.advance();
            else_body = this.check(TokenKind.If) ? [this.parseIf()] : this.parseStatementBlockOrSingle();
        }
        return { kind: 'if', condition, then_body, else_body };
    }

    protected parseStatementBlockOrSingle(): StatementAST[] {
        if (this.check(TokenKind.LeftBrace)) {
            this.advance();
            const body = this.parseStatements();
            this.expect(TokenKind.RightBrace);
            return body;
        }
        const stmt = this.parseStatement();
        return stmt ? [stmt] : [];
    }

    protected parseSwitch(): SwitchAST {
        this.expect(TokenKind.Switch);
        this.expect(TokenKind.LeftParen);
        const expr = this.collectBalanced(TokenKind.LeftParen, TokenKind.RightParen);
        this.expect(TokenKind.RightParen);
        this.expect(TokenKind.LeftBrace);
        const cases: { label: string; body: StatementAST[] }[] = [];
        let default_body: StatementAST[] | null = null;
        while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
            if (this.check(TokenKind.Case)) {
                this.advance();
                let label = '';
                while (!this.check(TokenKind.Colon) && !this.isAtEnd()) { label += this.advance().value; }
                this.expect(TokenKind.Colon);
                const body: StatementAST[] = [];
                while (
                    !this.check(TokenKind.Case) && !this.check(TokenKind.Default) &&
                    !this.check(TokenKind.RightBrace) && !this.isAtEnd()
                ) {
                    const s = this.parseStatement();
                    if (s) body.push(s);
                }
                cases.push({ label: label.trim(), body });
            } else if (this.check(TokenKind.Default)) {
                this.advance();
                this.expect(TokenKind.Colon);
                default_body = [];
                while (!this.check(TokenKind.Case) && !this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
                    const s = this.parseStatement();
                    if (s) default_body.push(s);
                }
            } else {
                this.advance();
            }
        }
        this.expect(TokenKind.RightBrace);
        return { kind: 'switch', expr, cases, default_body };
    }

    protected parseWhile(): WhileAST {
        this.expect(TokenKind.While);
        this.expect(TokenKind.LeftParen);
        const condition = this.collectBalanced(TokenKind.LeftParen, TokenKind.RightParen);
        this.expect(TokenKind.RightParen);
        this.expect(TokenKind.LeftBrace);
        const body = this.parseStatements();
        this.expect(TokenKind.RightBrace);
        return { kind: 'while', condition, body };
    }

    protected parseReturn(): ReturnAST {
        this.advance();
        let value: string | null = null;
        if (!this.check(TokenKind.Semicolon)) value = this.collectUntilSemicolon();
        if (this.check(TokenKind.Semicolon)) this.advance();
        return { kind: 'return', value };
    }

    protected parseVarDecl(): VarDeclAST {
        this.advance(); // consume 'const' or 'let'
        const name = this.advance().value;
        let type = '';
        if (this.check(TokenKind.Colon)) {
            this.advance();
            while (!this.check(TokenKind.Equals) && !this.check(TokenKind.Semicolon) && !this.isAtEnd()) {
                type += this.advance().value;
            }
        }
        this.expect(TokenKind.Equals);
        const value = this.collectUntilSemicolon();
        if (this.check(TokenKind.Semicolon)) this.advance();
        return { kind: 'var', name, type: type.trim(), value };
    }

    // Token-level assignment and expression parser.
    // Handles this.prop = expr, this.prop++/-- and compound assignments.
    protected parseAssignOrExpr(): AssignAST | ExprStmtAST {
        const saved_pos = this.pos;

        if (this.check(TokenKind.This)) {
            const target_result = this.tryParseAssignTarget();
            if (target_result) {
                const { target } = target_result;

                if (this.check(TokenKind.PlusPlus)) {
                    this.advance();
                    if (this.check(TokenKind.Semicolon)) this.advance();
                    return { kind: 'assign', target, value: `${target} + 1` };
                }
                if (this.check(TokenKind.MinusMinus)) {
                    this.advance();
                    if (this.check(TokenKind.Semicolon)) this.advance();
                    return { kind: 'assign', target, value: `${target} - 1` };
                }
                if (this.check(TokenKind.Equals)) {
                    this.advance();
                    const value = this.collectUntilSemicolon();
                    if (this.check(TokenKind.Semicolon)) this.advance();
                    return { kind: 'assign', target, value };
                }
                if (this.check(TokenKind.PlusEquals)) {
                    this.advance();
                    const rhs = this.collectUntilSemicolon();
                    if (this.check(TokenKind.Semicolon)) this.advance();
                    return { kind: 'assign', target, value: `${target} + ${rhs}` };
                }
                if (this.check(TokenKind.MinusEquals)) {
                    this.advance();
                    const rhs = this.collectUntilSemicolon();
                    if (this.check(TokenKind.Semicolon)) this.advance();
                    return { kind: 'assign', target, value: `${target} - ${rhs}` };
                }
                if (
                    (this.check(TokenKind.Ampersand) || this.check(TokenKind.Pipe) || this.check(TokenKind.Caret)) &&
                    this.peekAhead(1)?.kind === TokenKind.Equals
                ) {
                    const op = this.advance().value;
                    this.advance(); // consume '='
                    const rhs = this.collectUntilSemicolon();
                    if (this.check(TokenKind.Semicolon)) this.advance();
                    return { kind: 'assign', target, value: `${target} ${op} ${rhs}` };
                }
                this.pos = saved_pos;
            } else {
                this.pos = saved_pos;
            }
        }

        // Local variable assignment: IDENTIFIER = expr;
        if (this.check(TokenKind.Identifier)) {
            const localSavedPos = this.pos;
            const name = this.advance().value;
            if (this.check(TokenKind.Equals)) {
                this.advance();
                const value = this.collectUntilSemicolon();
                if (this.check(TokenKind.Semicolon)) this.advance();
                return { kind: 'assign', target: name, value };
            }
            this.pos = localSavedPos;
        }

        const text = this.collectUntilSemicolon();
        if (this.check(TokenKind.Semicolon)) this.advance();
        return { kind: 'expr', text };
    }

    private tryParseAssignTarget(): { target: string } | null {
        if (!this.check(TokenKind.This)) return null;
        this.advance();
        if (!this.check(TokenKind.Dot)) return null;
        this.advance();
        if (!this.check(TokenKind.Identifier)) return null;
        const prop_name = this.advance().value;
        let target = `this.${prop_name}`;
        if (this.check(TokenKind.LeftBracket)) {
            this.advance();
            const idx = this.collectBalanced(TokenKind.LeftBracket, TokenKind.RightBracket);
            this.expect(TokenKind.RightBracket);
            target = `this.${prop_name}[${idx}]`;
        }
        return { target };
    }
}
