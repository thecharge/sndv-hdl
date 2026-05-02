// Declaration-level parser: enums, properties, decorators, type specifiers.
// Extends ParserBase for token navigation primitives.

import { Token, TokenKind } from '../lexer/token';
import {
    DecoratorAST, EnumAST, PropertyAST, SubmoduleAST, PortMapEntry, ParamOverrideEntry,
} from './class-module-ast';
import { ParserBase } from './class-module-parser-base';

export class ClassDeclParser extends ParserBase {
    constructor(tokens: Token[]) {
        super(tokens);
    }

    protected skipImportsAndExports(): void {
        while (this.checkValue('import') && !this.isAtEnd()) {
            while (!this.isAtEnd() && !this.check(TokenKind.Semicolon)) this.advance();
            if (this.check(TokenKind.Semicolon)) this.advance();
        }
        while (this.check(TokenKind.Export) && !this.isAtEnd()) {
            const next = this.peekAhead(1);
            if (next && next.kind === TokenKind.LeftBrace) {
                while (!this.isAtEnd() && !this.check(TokenKind.Semicolon)) this.advance();
                if (this.check(TokenKind.Semicolon)) this.advance();
            } else {
                break;
            }
        }
    }

    protected parseEnum(): EnumAST {
        this.expect(TokenKind.Enum);
        const name = this.advance().value;
        this.expect(TokenKind.LeftBrace);
        const members: { name: string; value?: number }[] = [];
        let auto_val = 0;
        while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
            const member_name = this.advance().value;
            let value: number | undefined;
            if (this.check(TokenKind.Equals)) {
                this.advance();
                value = parseInt(this.advance().value, 10);
                auto_val = value + 1;
            } else {
                value = auto_val++;
            }
            members.push({ name: member_name, value });
            if (this.check(TokenKind.Comma)) this.advance();
        }
        this.expect(TokenKind.RightBrace);
        return { name, members };
    }

    protected parseDecorator(): DecoratorAST {
        this.expect(TokenKind.At);
        const name = this.advance().value;
        const args: string[] = [];
        if (this.check(TokenKind.LeftParen)) {
            this.advance();
            let depth = 1;
            let current = '';
            while (depth > 0 && !this.isAtEnd()) {
                if (this.check(TokenKind.LeftParen)) depth++;
                if (this.check(TokenKind.RightParen)) {
                    depth--;
                    if (depth === 0) break;
                }
                current += this.advance().value;
            }
            if (current) args.push(current);
            this.expect(TokenKind.RightParen);
        }
        return { name, args };
    }

    protected parseProperty(decorator: DecoratorAST | null): PropertyAST {
        let direction: 'input' | 'output' | 'internal' = 'internal';
        let is_const = false;

        if (this.check(TokenKind.Private)) { this.advance(); direction = 'internal'; }
        else if (this.check(TokenKind.Public)) { this.advance(); }

        if (this.checkValue('readonly') || this.checkValue('const')) {
            this.advance();
            is_const = true;
        }

        if (decorator) {
            if (decorator.name === 'Input') direction = 'input';
            if (decorator.name === 'Output') direction = 'output';
        }

        const name = this.advance().value;
        let bit_width = 32;
        let is_array = false;
        let array_size = 0;

        if (this.check(TokenKind.Colon)) {
            this.advance();
            const type_info = this.parseTypeSpec();
            bit_width = type_info.width;
            is_array = type_info.is_array;
            array_size = type_info.array_size;
        }

        let initial_value: string | null = null;
        if (this.check(TokenKind.Equals)) {
            this.advance();
            initial_value = this.collectUntilSemicolon();
        }

        // Infer LogicArray size from an array literal initialiser when SIZE was omitted.
        if (is_array && array_size === 0 && initial_value) {
            const trimmed = initial_value.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                const inner = trimmed.slice(1, -1).trim();
                if (inner.length === 0) {
                    array_size = 0;
                } else {
                    let depth = 0;
                    let count = 1;
                    for (const ch of inner) {
                        if (ch === '[' || ch === '(') depth++;
                        else if (ch === ']' || ch === ')') depth--;
                        else if (ch === ',' && depth === 0) count++;
                    }
                    array_size = count;
                }
            }
        }

        if (this.check(TokenKind.Semicolon)) this.advance();

        return { name, direction, bit_width, initial_value, is_array, array_size, is_const };
    }

    protected parseTypeSpec(): { width: number; is_array: boolean; array_size: number } {
        let width = 32;
        let is_array = false;
        let array_size = 0;
        const type_token = this.advance();
        const type_name = type_token.value;

        if (type_name === 'LogicArray') {
            if (this.check(TokenKind.LessThan)) {
                this.advance();
                const w_token = this.advance();
                width = this.parsePositiveInteger(w_token, 'bit width (LogicArray first generic)');
                if (this.check(TokenKind.Comma)) {
                    this.advance();
                    array_size = this.parsePositiveInteger(this.advance(), 'array size (LogicArray second generic)');
                }
                // If SIZE omitted, leave array_size=0 — parseProperty will infer from initialiser.
                this.expect(TokenKind.GreaterThan);
            } else {
                throw new Error(
                    `LogicArray requires at least one generic argument <W> or <W, SIZE> at line ${type_token.line}, col ${type_token.column}`
                );
            }
            is_array = true;
        } else if (type_name === 'Logic' || type_name === 'Int') {
            if (this.check(TokenKind.LessThan)) {
                this.advance();
                width = this.parsePositiveInteger(this.advance(), 'bit width');
                this.expect(TokenKind.GreaterThan);
            }
        } else if (type_name === 'boolean' || type_name === 'Bit' || type_name === 'Uint1') {
            width = 1;
        } else if (type_name === 'number' || type_name === 'Uint32') {
            width = 32;
        } else if (type_name === 'Uint2') {
            width = 2;
        } else if (type_name === 'Uint4') {
            width = 4;
        } else if (type_name === 'Uint8') {
            width = 8;
        } else if (type_name === 'Uint16') {
            width = 16;
        } else if (type_name === 'Uint64') {
            width = 64;
        } else if (type_name === 'PwmCore' || type_name === 'HardwareModule') {
            width = 1;
        } else {
            const uint_match = /^(?:Uint|UInt)(\d+)$/.exec(type_name);
            if (uint_match) {
                width = this.parsePositiveIntegerLiteral(uint_match[1], type_token, 'bit width');
            }
        }

        if (this.check(TokenKind.LeftBracket)) {
            this.advance();
            is_array = true;
            if (this.check(TokenKind.RightBracket)) {
                this.advance();
            } else {
                array_size = this.parsePositiveInteger(this.advance(), 'array size');
                this.expect(TokenKind.RightBracket);
            }
        }

        return { width, is_array, array_size };
    }

    protected parsePositiveInteger(token: Token, field_name: string): number {
        return this.parsePositiveIntegerLiteral(token.value, token, field_name);
    }

    protected parsePositiveIntegerLiteral(value: string, token: Token, field_name: string): number {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new Error(
                `Expected positive integer ${field_name} but got "${value}" at line ${token.line}, col ${token.column}`
            );
        }
        return parsed;
    }

    protected parseSubmoduleDecl(dec: DecoratorAST): SubmoduleAST {
        const prop = this.parseProperty(dec);
        let module_type = '';
        const port_map: PortMapEntry[] = [];
        const param_map: ParamOverrideEntry[] = [];

        if (prop.initial_value) {
            const m = prop.initial_value.match(/^new\s+(\w+)/);
            if (m) module_type = m[1];
        }

        if (dec.args.length > 0) {
            const args_str = dec.args[0];
            const bindings = args_str.split(',').map(s => s.trim()).filter(Boolean);
            for (const b of bindings) {
                if (b.includes('=')) {
                    const parts = b.split('=').map(s => s.trim().replace(/['"]/g, ''));
                    if (parts.length === 2) {
                        param_map.push({ param_name: parts[0], value: parts[1] });
                    }
                } else {
                    const parts = b.split(':').map(s => s.trim().replace(/['"]/g, ''));
                    if (parts.length === 2) {
                        port_map.push({ port_name: parts[0], wire_name: parts[1] });
                    }
                }
            }
        }

        return { instance_name: prop.name, module_type, port_map, param_map };
    }
}
