"use strict";
// Top-level module parser: orchestrates parsing of TypeScript @Module classes
// into ClassModuleAST. Extends ClassStmtParser via the inheritance chain.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassModuleParser = void 0;
const lexer_1 = require("../lexer/lexer");
const token_1 = require("../lexer/token");
const class_stmt_parser_1 = require("./class-stmt-parser");
class ClassModuleParser extends class_stmt_parser_1.ClassStmtParser {
    constructor(source) {
        super(new lexer_1.Lexer(source).tokenize());
    }
    parse() {
        const enums = [];
        const modules = [];
        const consts = [];
        while (!this.isAtEnd()) {
            this.skipImportsAndExports();
            if (this.isAtEnd())
                break;
            if (this.check(token_1.TokenKind.Enum)) {
                enums.push(this.parseEnum());
            }
            else if (this.check(token_1.TokenKind.Const)) {
                const c = this.parseTopLevelConst();
                if (c)
                    consts.push(c);
            }
            else if (this.check(token_1.TokenKind.At) ||
                this.check(token_1.TokenKind.Class) ||
                this.check(token_1.TokenKind.Export)) {
                modules.push(this.parseClass(enums));
            }
            else {
                this.advance();
            }
        }
        return { enums, modules, consts };
    }
    parseTopLevelConst() {
        this.advance(); // consume 'const'
        if (!this.check(token_1.TokenKind.Identifier)) {
            this.skipToSemicolonOrBrace();
            return null;
        }
        const name = this.advance().value;
        // Skip optional type annotation: ': type'
        if (this.check(token_1.TokenKind.Colon)) {
            this.advance();
            while (!this.check(token_1.TokenKind.Equals) && !this.check(token_1.TokenKind.Semicolon) && !this.isAtEnd()) {
                this.advance();
            }
        }
        if (!this.check(token_1.TokenKind.Equals)) {
            this.skipToSemicolonOrBrace();
            return null;
        }
        this.advance(); // consume '='
        const value = this.collectUntilSemicolon();
        if (this.check(token_1.TokenKind.Semicolon))
            this.advance();
        return { name, value };
    }
    parseClass(enums) {
        const decorators = [];
        while (this.check(token_1.TokenKind.At)) {
            decorators.push(this.parseDecorator());
        }
        if (this.check(token_1.TokenKind.Export))
            this.advance();
        this.expect(token_1.TokenKind.Class);
        const name = this.advance().value;
        let base_class = null;
        if (this.check(token_1.TokenKind.Extends)) {
            this.advance();
            base_class = this.advance().value;
        }
        // Skip generic parameters <...>
        if (this.check(token_1.TokenKind.LessThan)) {
            let depth = 1;
            this.advance();
            while (depth > 0 && !this.isAtEnd()) {
                if (this.check(token_1.TokenKind.LessThan))
                    depth++;
                if (this.check(token_1.TokenKind.GreaterThan))
                    depth--;
                this.advance();
            }
        }
        this.expect(token_1.TokenKind.LeftBrace);
        const config = {
            reset_signal: 'rst_n',
            reset_polarity: 'active_low',
            reset_type: 'async',
        };
        const config_dec = decorators.find(d => d.name === 'ModuleConfig');
        if (config_dec && config_dec.args.length > 0) {
            const cfg_str = config_dec.args.join(',');
            if (cfg_str.includes('active_high'))
                config.reset_polarity = 'active_high';
            if (cfg_str.includes('synchronous'))
                config.reset_type = 'sync';
            const sig_match = cfg_str.match(/resetSignal[:\s]*["']?(\w+)["']?/);
            if (sig_match)
                config.reset_signal = sig_match[1];
        }
        const properties = [];
        const parameters = [];
        const methods = [];
        const submodules = [];
        const assertions = [];
        const helpers = {};
        while (!this.check(token_1.TokenKind.RightBrace) && !this.isAtEnd()) {
            if (this.check(token_1.TokenKind.At)) {
                const dec = this.parseDecorator();
                if (dec.name === 'Submodule') {
                    submodules.push(this.parseSubmoduleDecl(dec));
                    continue;
                }
                if (dec.name === 'Param') {
                    const prop = this.parseProperty(dec);
                    const default_value = Number(prop.initial_value?.trim() ?? '');
                    if (!Number.isFinite(default_value)) {
                        throw new Error(`@Param '${prop.name}' requires a numeric literal initialiser (got "${prop.initial_value ?? ''}")`);
                    }
                    parameters.push({ name: prop.name, bit_width: prop.bit_width, default_value });
                    continue;
                }
                if (dec.name === 'Assert') {
                    const cond = dec.args[0] || 'true';
                    let actual_cond = cond;
                    let message = null;
                    let depth = 0;
                    let split_at = -1;
                    for (let i = 0; i < cond.length; i++) {
                        if (cond[i] === '(' || cond[i] === '[')
                            depth++;
                        if (cond[i] === ')' || cond[i] === ']')
                            depth--;
                        if (depth === 0 && cond[i] === ',') {
                            split_at = i;
                            break;
                        }
                    }
                    if (split_at >= 0) {
                        actual_cond = cond.substring(0, split_at).trim();
                        message = cond.substring(split_at + 1).trim().replace(/^["']|["']$/g, '');
                    }
                    assertions.push({ label: `assert_${assertions.length}`, condition: actual_cond, clock: 'clk', message });
                    continue;
                }
                if (this.check(token_1.TokenKind.Identifier) ||
                    this.check(token_1.TokenKind.Private) ||
                    this.check(token_1.TokenKind.Public)) {
                    if (this.peekIsMethod()) {
                        methods.push(this.parseMethod(dec));
                    }
                    else {
                        properties.push(this.parseProperty(dec));
                    }
                }
                else if (this.check(token_1.TokenKind.Async)) {
                    methods.push(this.parseMethod(dec));
                }
                else {
                    this.skipToSemicolonOrBrace();
                }
            }
            else if (this.check(token_1.TokenKind.Private) || this.check(token_1.TokenKind.Public)) {
                // Private/public non-decorated: could be a property or a helper method.
                if (this.peekIsMethod()) {
                    const m = this.parseMethod(null);
                    helpers[m.name] = m.body;
                }
                else {
                    properties.push(this.parseProperty(null));
                }
            }
            else if (this.check(token_1.TokenKind.Identifier)) {
                if (this.peekIsMethod()) {
                    methods.push(this.parseMethod(null));
                }
                else {
                    properties.push(this.parseProperty(null));
                }
            }
            else if (this.check(token_1.TokenKind.Async)) {
                methods.push(this.parseMethod(null));
            }
            else {
                this.advance();
            }
        }
        this.expect(token_1.TokenKind.RightBrace);
        if (properties.some(p => p.name === 'Bits')) {
            console.warn(`[ts2v warning] Class '${name}' declares a property named 'Bits' which shadows the Bits compiler intrinsic namespace.`);
        }
        for (const param of parameters) {
            if (properties.some(p => p.name === param.name)) {
                throw new Error(`@Param '${param.name}' collides with an existing property of the same name in module '${name}'`);
            }
        }
        return { name, base_class, decorators, config, enums, properties, parameters, methods, submodules, assertions, helpers };
    }
    parseMethod(decorator) {
        let is_async = false;
        // Consume optional access modifier (private / public) before method name.
        if (this.check(token_1.TokenKind.Private) || this.check(token_1.TokenKind.Public))
            this.advance();
        if (this.check(token_1.TokenKind.Async)) {
            this.advance();
            is_async = true;
        }
        const name = this.advance().value;
        let type = 'combinational';
        let clock = 'clk';
        if (decorator) {
            if (decorator.name === 'Sequential') {
                type = 'sequential';
                if (decorator.args.length > 0)
                    clock = decorator.args[0].replace(/[()'"]/g, '').trim();
            }
        }
        this.expect(token_1.TokenKind.LeftParen);
        while (!this.check(token_1.TokenKind.RightParen) && !this.isAtEnd())
            this.advance();
        this.expect(token_1.TokenKind.RightParen);
        if (this.check(token_1.TokenKind.Colon)) {
            this.advance();
            while (!this.check(token_1.TokenKind.LeftBrace) && !this.isAtEnd())
                this.advance();
        }
        this.expect(token_1.TokenKind.LeftBrace);
        const body = this.parseStatements();
        this.expect(token_1.TokenKind.RightBrace);
        const has_await = this.bodyHasAwait(body);
        return { name, type, clock, is_async, body, has_await };
    }
    bodyHasAwait(stmts) {
        for (const s of stmts) {
            if (s.kind === 'await')
                return true;
            if (s.kind === 'if') {
                if (this.bodyHasAwait(s.then_body))
                    return true;
                if (s.else_body && this.bodyHasAwait(s.else_body))
                    return true;
            }
            if (s.kind === 'switch') {
                for (const c of s.cases)
                    if (this.bodyHasAwait(c.body))
                        return true;
                if (s.default_body && this.bodyHasAwait(s.default_body))
                    return true;
            }
        }
        return false;
    }
}
exports.ClassModuleParser = ClassModuleParser;
//# sourceMappingURL=class-module-parser.js.map