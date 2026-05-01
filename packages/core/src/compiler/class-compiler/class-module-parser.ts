// Top-level module parser: orchestrates parsing of TypeScript @Module classes
// into ClassModuleAST. Extends ClassStmtParser via the inheritance chain.

import { Lexer } from '../lexer/lexer';
import { TokenKind } from '../lexer/token';
import {
    ClassModuleAST, ClockDomainAST, DecoratorAST, ModuleConfig, MethodAST, StatementAST,
    EnumAST, AssertionAST, TopLevelConstAST, ModuleParameterAST,
} from './class-module-ast';
import { ClassStmtParser } from './class-stmt-parser';

export class ClassModuleParser extends ClassStmtParser {
    constructor(source: string) {
        super(new Lexer(source).tokenize());
    }

    parse(): { enums: EnumAST[]; modules: ClassModuleAST[]; consts: TopLevelConstAST[] } {
        const enums: EnumAST[] = [];
        const modules: ClassModuleAST[] = [];
        const consts: TopLevelConstAST[] = [];
        while (!this.isAtEnd()) {
            this.skipImportsAndExports();
            if (this.isAtEnd()) break;
            if (this.check(TokenKind.Enum)) {
                enums.push(this.parseEnum());
            } else if (this.check(TokenKind.Const)) {
                const c = this.parseTopLevelConst();
                if (c) consts.push(c);
            } else if (
                this.check(TokenKind.At) ||
                this.check(TokenKind.Class) ||
                this.check(TokenKind.Export)
            ) {
                modules.push(this.parseClass(enums));
            } else {
                this.advance();
            }
        }
        return { enums, modules, consts };
    }

    private parseTopLevelConst(): TopLevelConstAST | null {
        this.advance(); // consume 'const'
        if (!this.check(TokenKind.Identifier)) {
            this.skipToSemicolonOrBrace();
            return null;
        }
        const name = this.advance().value;
        // Skip optional type annotation: ': type'
        if (this.check(TokenKind.Colon)) {
            this.advance();
            while (!this.check(TokenKind.Equals) && !this.check(TokenKind.Semicolon) && !this.isAtEnd()) {
                this.advance();
            }
        }
        if (!this.check(TokenKind.Equals)) {
            this.skipToSemicolonOrBrace();
            return null;
        }
        this.advance(); // consume '='
        const value = this.collectUntilSemicolon();
        if (this.check(TokenKind.Semicolon)) this.advance();
        return { name, value };
    }

    private parseClass(enums: EnumAST[]): ClassModuleAST {
        const decorators = [];
        while (this.check(TokenKind.At)) {
            decorators.push(this.parseDecorator());
        }
        if (this.check(TokenKind.Export)) this.advance();
        this.expect(TokenKind.Class);
        const name = this.advance().value;

        let base_class: string | null = null;
        if (this.check(TokenKind.Extends)) {
            this.advance();
            base_class = this.advance().value;
        }

        // Skip generic parameters <...>
        if (this.check(TokenKind.LessThan)) {
            let depth = 1;
            this.advance();
            while (depth > 0 && !this.isAtEnd()) {
                if (this.check(TokenKind.LessThan)) depth++;
                if (this.check(TokenKind.GreaterThan)) depth--;
                this.advance();
            }
        }

        this.expect(TokenKind.LeftBrace);

        const config: ModuleConfig = {
            reset_signal: 'rst_n',
            reset_polarity: 'active_low',
            reset_type: 'async',
        };

        const config_dec = decorators.find(d => d.name === 'ModuleConfig');
        if (config_dec && config_dec.args.length > 0) {
            const cfg_str = config_dec.args.join(',');
            if (cfg_str.includes('active_high')) config.reset_polarity = 'active_high';
            if (cfg_str.includes('synchronous')) config.reset_type = 'sync';
            const sig_match = cfg_str.match(/resetSignal[:\s]*["']?(\w+)["']?/);
            if (sig_match) config.reset_signal = sig_match[1];
        }

        const clocks: ClockDomainAST[] = [];
        for (const dec of decorators) {
            if (dec.name === 'ClockDomain' && dec.args.length > 0) {
                // args[0] is the entire content between parens, e.g. "'sys',{freq:27000000}"
                const raw = dec.args[0];
                // First token before comma is the domain name (quotes stripped by lexer)
                const domainName = raw.split(',')[0].trim();
                if (clocks.some(c => c.name === domainName)) {
                    throw new Error(`Duplicate @ClockDomain name '${domainName}' in module '${name}'`);
                }
                const domain: ClockDomainAST = { name: domainName };
                const freqMatch = raw.match(/freq\s*:\s*(\d[\d_]*)/);
                if (freqMatch) domain.freq = parseInt(freqMatch[1].replace(/_/g, ''), 10);
                const pinMatch = raw.match(/pin\s*:\s*['"]?([^'"}{,\s]+)['"]?/);
                if (pinMatch) domain.pin = pinMatch[1];
                clocks.push(domain);
            }
        }

        const properties = [];
        const parameters: ModuleParameterAST[] = [];
        const methods = [];
        const submodules = [];
        const assertions: AssertionAST[] = [];
        const helpers: Record<string, StatementAST[]> = {};

        while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
            if (this.check(TokenKind.At)) {
                const dec = this.parseDecorator();

                if (dec.name === 'Submodule') {
                    submodules.push(this.parseSubmoduleDecl(dec));
                    continue;
                }

                if (dec.name === 'Param') {
                    const prop = this.parseProperty(dec);
                    const default_value = Number(prop.initial_value?.trim() ?? '');
                    if (!Number.isFinite(default_value)) {
                        throw new Error(
                            `@Param '${prop.name}' requires a numeric literal initialiser (got "${prop.initial_value ?? ''}")`
                        );
                    }
                    parameters.push({ name: prop.name, bit_width: prop.bit_width, default_value });
                    continue;
                }

                if (dec.name === 'Assert') {
                    const cond = dec.args[0] || 'true';
                    let actual_cond = cond;
                    let message: string | null = null;
                    let depth = 0;
                    let split_at = -1;
                    for (let i = 0; i < cond.length; i++) {
                        if (cond[i] === '(' || cond[i] === '[') depth++;
                        if (cond[i] === ')' || cond[i] === ']') depth--;
                        if (depth === 0 && cond[i] === ',') { split_at = i; break; }
                    }
                    if (split_at >= 0) {
                        actual_cond = cond.substring(0, split_at).trim();
                        message = cond.substring(split_at + 1).trim().replace(/^["']|["']$/g, '');
                    }
                    assertions.push({ label: `assert_${assertions.length}`, condition: actual_cond, clock: 'clk', message });
                    continue;
                }

                if (
                    this.check(TokenKind.Identifier) ||
                    this.check(TokenKind.Private) ||
                    this.check(TokenKind.Public)
                ) {
                    if (this.peekIsMethod()) {
                        methods.push(this.parseMethod(dec));
                    } else {
                        properties.push(this.parseProperty(dec));
                    }
                } else if (this.check(TokenKind.Async)) {
                    methods.push(this.parseMethod(dec));
                } else {
                    this.skipToSemicolonOrBrace();
                }
            } else if (this.check(TokenKind.Private) || this.check(TokenKind.Public)) {
                // Private/public non-decorated: could be a property or a helper method.
                if (this.peekIsMethod()) {
                    const m = this.parseMethod(null);
                    helpers[m.name] = m.body;
                } else {
                    properties.push(this.parseProperty(null));
                }
            } else if (this.check(TokenKind.Identifier)) {
                if (this.peekIsMethod()) {
                    methods.push(this.parseMethod(null));
                } else {
                    properties.push(this.parseProperty(null));
                }
            } else if (this.check(TokenKind.Async)) {
                methods.push(this.parseMethod(null));
            } else {
                this.advance();
            }
        }
        this.expect(TokenKind.RightBrace);

        if (properties.some(p => p.name === 'Bits')) {
            console.warn(`[ts2v warning] Class '${name}' declares a property named 'Bits' which shadows the Bits compiler intrinsic namespace.`);
        }

        for (const param of parameters) {
            if (properties.some(p => p.name === param.name)) {
                throw new Error(
                    `@Param '${param.name}' collides with an existing property of the same name in module '${name}'`
                );
            }
        }

        return { name, base_class, decorators, config, clocks, enums, properties, parameters, methods, submodules, assertions, helpers };
    }

    private parseMethod(decorator: DecoratorAST | null): MethodAST {
        let is_async = false;
        // Consume optional access modifier (private / public) before method name.
        if (this.check(TokenKind.Private) || this.check(TokenKind.Public)) this.advance();
        if (this.check(TokenKind.Async)) { this.advance(); is_async = true; }

        const name = this.advance().value;
        let type: 'sequential' | 'combinational' = 'combinational';
        let clock = 'clk';

        let clock_domain: string | undefined;
        if (decorator) {
            if (decorator.name === 'Sequential') {
                type = 'sequential';
                if (decorator.args.length > 0) {
                    const raw = decorator.args[0];
                    // First quoted token is the clock signal name
                    const clkMatch = raw.match(/^['"]?([^'",{}\s]+)['"]?/);
                    clock = clkMatch ? clkMatch[1].replace(/['"]/g, '') : 'clk';
                    // Optional { clock: 'domainName' } object in the arg string
                    const domainMatch = raw.match(/clock\s*:\s*['"]?([^'"}{,\s]+)['"]?/);
                    if (domainMatch) clock_domain = domainMatch[1];
                }
            }
        }

        this.expect(TokenKind.LeftParen);
        while (!this.check(TokenKind.RightParen) && !this.isAtEnd()) this.advance();
        this.expect(TokenKind.RightParen);

        if (this.check(TokenKind.Colon)) {
            this.advance();
            while (!this.check(TokenKind.LeftBrace) && !this.isAtEnd()) this.advance();
        }

        this.expect(TokenKind.LeftBrace);
        const body = this.parseStatements();
        this.expect(TokenKind.RightBrace);
        const has_await = this.bodyHasAwait(body);

        return { name, type, clock, clock_domain, is_async, body, has_await };
    }

    private bodyHasAwait(stmts: StatementAST[]): boolean {
        for (const s of stmts) {
            if (s.kind === 'await') return true;
            if (s.kind === 'if') {
                if (this.bodyHasAwait(s.then_body)) return true;
                if (s.else_body && this.bodyHasAwait(s.else_body)) return true;
            }
            if (s.kind === 'switch') {
                for (const c of s.cases) if (this.bodyHasAwait(c.body)) return true;
                if (s.default_body && this.bodyHasAwait(s.default_body)) return true;
            }
        }
        return false;
    }
}
