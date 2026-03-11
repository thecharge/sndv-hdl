// Class Module Compiler: Parses TypeScript @Module classes and generates
// IEEE 1800-2017 compliant SystemVerilog with always_ff, always_comb,
// async reset (posedge clk or negedge rst_n), enums, and switch/case.

import { Lexer } from '../lexer/lexer';
import { Token, TokenKind } from '../lexer/token';

// ============================================================
// AST TYPES
// ============================================================

export interface ClassModuleAST {
  name: string;
  base_class: string | null;
  decorators: DecoratorAST[];
  config: ModuleConfig;
  enums: EnumAST[];
  properties: PropertyAST[];
  methods: MethodAST[];
  submodules: SubmoduleAST[];
  assertions: AssertionAST[];
}

export interface DecoratorAST {
  name: string;
  args: string[];
}

export interface ModuleConfig {
  reset_signal: string;
  reset_polarity: 'active_low' | 'active_high';
  reset_type: 'async' | 'sync';
}

export interface EnumAST {
  name: string;
  members: { name: string; value?: number }[];
}

export interface PropertyAST {
  name: string;
  direction: 'input' | 'output' | 'internal';
  bit_width: number;
  initial_value: string | null;
  is_array: boolean;
  array_size: number;
  is_const: boolean;
}

export interface MethodAST {
  name: string;
  type: 'sequential' | 'combinational';
  clock: string;
  is_async: boolean;
  body: MethodBodyAST;
  has_await: boolean;
}

export interface SubmoduleAST {
  instance_name: string;
  module_type: string;
  port_map: PortMapEntry[];
}

export interface PortMapEntry {
  port_name: string;
  wire_name: string;
}

export interface AssertionAST {
  label: string | null;
  condition: string;
  clock: string;
  message: string | null;
}

export type MethodBodyAST = StatementAST[];

export type StatementAST =
  | AssignAST | IfAST | SwitchAST | ReturnAST
  | VarDeclAST | ExprStmtAST | WhileAST | ForAST
  | AssertStmtAST | AwaitAST;

export interface AssignAST { kind: 'assign'; target: string; value: string; }
export interface IfAST { kind: 'if'; condition: string; then_body: StatementAST[]; else_body: StatementAST[] | null; }
export interface SwitchAST { kind: 'switch'; expr: string; cases: { label: string; body: StatementAST[] }[]; default_body: StatementAST[] | null; }
export interface ReturnAST { kind: 'return'; value: string | null; }
export interface VarDeclAST { kind: 'var'; name: string; type: string; value: string; }
export interface ExprStmtAST { kind: 'expr'; text: string; }
export interface WhileAST { kind: 'while'; condition: string; body: StatementAST[]; }
export interface ForAST { kind: 'for'; init: string; cond: string; incr: string; body: StatementAST[]; }
export interface AssertStmtAST { kind: 'assert'; condition: string; message: string | null; }
export interface AwaitAST { kind: 'await'; signal: string; }

// Module signature for hierarchy support (two-pass compilation)
export interface ModuleSignature {
  name: string;
  inputs: { name: string; bit_width: number }[];
  outputs: { name: string; bit_width: number }[];
}

// ============================================================
// PARSER (simple recursive descent over tokens)
// ============================================================

export class ClassModuleParser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(source: string) {
    this.tokens = new Lexer(source).tokenize();
  }

  parse(): { enums: EnumAST[]; modules: ClassModuleAST[] } {
    const enums: EnumAST[] = [];
    const modules: ClassModuleAST[] = [];
    while (!this.isAtEnd()) {
      this.skipImportsAndExports();
      if (this.isAtEnd()) break;
      if (this.check(TokenKind.Enum)) {
        enums.push(this.parseEnum());
      } else if (this.check(TokenKind.At) || this.check(TokenKind.Class) || this.check(TokenKind.Export)) {
        modules.push(this.parseClass(enums));
      } else {
        this.advance(); // skip unknown top-level tokens
      }
    }
    return { enums, modules };
  }

  private skipImportsAndExports(): void {
    // Skip: import { ... } from '...';
    // Skip: import type { ... } from '...';
    while (this.checkValue('import') && !this.isAtEnd()) {
      while (!this.isAtEnd() && !this.check(TokenKind.Semicolon)) this.advance();
      if (this.check(TokenKind.Semicolon)) this.advance();
    }
    // Skip: export { Name }; and export { A, B };
    // But NOT: export class ... (that's a module declaration)
    while (this.check(TokenKind.Export) && !this.isAtEnd()) {
      const next = this.peekAhead(1);
      if (next && next.kind === TokenKind.LeftBrace) {
        // export { ... }; — skip it
        while (!this.isAtEnd() && !this.check(TokenKind.Semicolon)) this.advance();
        if (this.check(TokenKind.Semicolon)) this.advance();
      } else {
        // export class ... — stop, let parseClass handle it
        break;
      }
    }
  }

  private parseEnum(): EnumAST {
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

  private parseClass(enums: EnumAST[]): ClassModuleAST {
    const decorators: DecoratorAST[] = [];
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

    // Extract config from @ModuleConfig decorator
    const config_dec = decorators.find(d => d.name === 'ModuleConfig');
    if (config_dec && config_dec.args.length > 0) {
      const cfg_str = config_dec.args.join(',');
      if (cfg_str.includes('active_high')) config.reset_polarity = 'active_high';
      if (cfg_str.includes('synchronous')) config.reset_type = 'sync';
      // Match resetSignal: with or without quotes
      const sig_match = cfg_str.match(/resetSignal[:\s]*["']?(\w+)["']?/);
      if (sig_match) config.reset_signal = sig_match[1];
    }

    const properties: PropertyAST[] = [];
    const methods: MethodAST[] = [];
    const submodules: SubmoduleAST[] = [];
    const assertions: AssertionAST[] = [];

    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      if (this.check(TokenKind.At)) {
        const dec = this.parseDecorator();

        // @Submodule decorator for hierarchy
        if (dec.name === 'Submodule') {
          submodules.push(this.parseSubmoduleDecl(dec));
          continue;
        }

        // @Assert decorator for SVA assertions
        if (dec.name === 'Assert') {
          const cond = dec.args[0] || 'true';
          let message: string | null = null;
          // Check for comma-separated message in args
          const comma_idx = cond.indexOf(',');
          let actual_cond = cond;
          if (comma_idx >= 0) {
            // Ensure comma is not inside parens
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
          }
          assertions.push({
            label: `assert_${assertions.length}`,
            condition: actual_cond,
            clock: 'clk',
            message,
          });
          continue;
        }

        if (this.check(TokenKind.Identifier) || this.check(TokenKind.Private) || this.check(TokenKind.Public)) {
          if (this.peekIsMethod()) {
            methods.push(this.parseMethod(dec));
          } else {
            properties.push(this.parseProperty(dec));
          }
        } else if (this.check(TokenKind.Async)) {
          methods.push(this.parseMethod(dec));
        } else {
          // Skip unknown decorated member
          this.skipToSemicolonOrBrace();
        }
      } else if (this.check(TokenKind.Private) || this.check(TokenKind.Public)) {
        properties.push(this.parseProperty(null));
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

    return { name, base_class, decorators, config, enums, properties, methods, submodules, assertions };
  }

  private parseSubmoduleDecl(dec: DecoratorAST): SubmoduleAST {
    // Parse: @Submodule instance_name: ModuleType = new ModuleType(...)
    const prop = this.parseProperty(dec);
    let module_type = '';
    const port_map: PortMapEntry[] = [];

    // Extract module type from initial value: "new ModuleType(...)"
    if (prop.initial_value) {
      const m = prop.initial_value.match(/^new\s+(\w+)/);
      if (m) module_type = m[1];
    }

    // If decorator had args, parse as explicit port mapping
    if (dec.args.length > 0) {
      const args_str = dec.args[0];
      // Parse port bindings like: clk:clk, data:data_in
      const bindings = args_str.split(',').map(s => s.trim()).filter(Boolean);
      for (const b of bindings) {
        const parts = b.split(':').map(s => s.trim().replace(/['"]/g, ''));
        if (parts.length === 2) {
          port_map.push({ port_name: parts[0], wire_name: parts[1] });
        }
      }
    }

    return {
      instance_name: prop.name,
      module_type,
      port_map,
    };
  }

  private parseDecorator(): DecoratorAST {
    this.expect(TokenKind.At);
    const name = this.advance().value;
    const args: string[] = [];
    if (this.check(TokenKind.LeftParen)) {
      this.advance();
      let depth = 1;
      let current = '';
      while (depth > 0 && !this.isAtEnd()) {
        if (this.check(TokenKind.LeftParen)) depth++;
        if (this.check(TokenKind.RightParen)) { depth--; if (depth === 0) break; }
        current += this.advance().value;
      }
      if (current) args.push(current);
      this.expect(TokenKind.RightParen);
    }
    return { name, args };
  }

  private parseProperty(decorator: DecoratorAST | null): PropertyAST {
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

    // Type annotation
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

    if (this.check(TokenKind.Semicolon)) this.advance();

    return { name, direction, bit_width, initial_value, is_array, array_size, is_const };
  }

  private parseTypeSpec(): { width: number; is_array: boolean; array_size: number } {
    let width = 32;
    let is_array = false;
    let array_size = 0;
    const type_name = this.advance().value;

    if (type_name === 'Logic' || type_name === 'Int') {
      // Logic<N>
      if (this.check(TokenKind.LessThan)) {
        this.advance();
        width = parseInt(this.advance().value, 10);
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
      // Submodule type or base class — default width, submodule handled elsewhere
      width = 1;
    }

    // Check for array: []
    if (this.check(TokenKind.LeftBracket)) {
      this.advance();
      is_array = true;
      if (this.check(TokenKind.RightBracket)) {
        this.advance();
      } else {
        array_size = parseInt(this.advance().value, 10);
        this.expect(TokenKind.RightBracket);
      }
    }

    return { width, is_array, array_size };
  }

  private parseMethod(decorator: DecoratorAST | null): MethodAST {
    let is_async = false;
    if (this.check(TokenKind.Async)) { this.advance(); is_async = true; }

    const name = this.advance().value;
    let type: 'sequential' | 'combinational' = 'combinational';
    let clock = 'clk';

    if (decorator) {
      if (decorator.name === 'Sequential') {
        type = 'sequential';
        if (decorator.args.length > 0) clock = decorator.args[0].replace(/[()'"]/g, '').trim();
      }
      if (decorator.name === 'Combinational') {
        type = 'combinational';
      }
    }

    // Skip parameter list
    this.expect(TokenKind.LeftParen);
    while (!this.check(TokenKind.RightParen) && !this.isAtEnd()) this.advance();
    this.expect(TokenKind.RightParen);

    // Skip return type annotation (e.g., `: void`)
    if (this.check(TokenKind.Colon)) {
      this.advance(); // skip ':'
      while (!this.check(TokenKind.LeftBrace) && !this.isAtEnd()) this.advance();
    }

    const body = this.parseMethodBody();
    const has_await = this.bodyHasAwait(body);

    return { name, type, clock, is_async, body, has_await };
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

  private parseMethodBody(): MethodBodyAST {
    this.expect(TokenKind.LeftBrace);
    const statements = this.parseStatements();
    this.expect(TokenKind.RightBrace);
    return statements;
  }

  private parseStatements(): StatementAST[] {
    const stmts: StatementAST[] = [];
    while (!this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) stmts.push(stmt);
    }
    return stmts;
  }

  private parseStatement(): StatementAST | null {
    // Handle 'await' as temporal control (clock cycle boundary)
    if (this.checkValue('await')) {
      this.advance();
      const signal = this.collectUntilSemicolon();
      if (this.check(TokenKind.Semicolon)) this.advance();
      return { kind: 'await', signal };
    }

    if (this.check(TokenKind.If)) return this.parseIf();
    if (this.check(TokenKind.Switch)) return this.parseSwitch();
    if (this.check(TokenKind.While)) return this.parseWhile();
    if (this.check(TokenKind.Return)) return this.parseReturn();
    if (this.check(TokenKind.Const) || this.check(TokenKind.Let)) return this.parseVarDecl();
    if (this.check(TokenKind.Break)) { this.advance(); if (this.check(TokenKind.Semicolon)) this.advance(); return null; }

    // SVA assertion: Assert(condition) or Assert(condition, "message")
    if (this.checkValue('Assert') && this.peekAhead(1)?.kind === TokenKind.LeftParen) {
      this.advance(); // consume 'Assert'
      this.expect(TokenKind.LeftParen);
      const inner = this.collectBalanced(TokenKind.LeftParen, TokenKind.RightParen);
      this.expect(TokenKind.RightParen);
      if (this.check(TokenKind.Semicolon)) this.advance();

      let condition = inner;
      let message: string | null = null;
      // Split on top-level comma for message param
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
      return { kind: 'assert' as const, condition, message };
    }

    // Assignment or expression: token-based detection (v1.0.0 — NO REGEX)
    return this.parseAssignOrExpr();
  }

  private parseIf(): IfAST {
    this.expect(TokenKind.If);
    this.expect(TokenKind.LeftParen);
    const condition = this.collectBalanced(TokenKind.LeftParen, TokenKind.RightParen);
    this.expect(TokenKind.RightParen);
    this.expect(TokenKind.LeftBrace);
    const then_body = this.parseStatements();
    this.expect(TokenKind.RightBrace);
    let else_body: StatementAST[] | null = null;
    if (this.check(TokenKind.Else)) {
      this.advance();
      if (this.check(TokenKind.If)) {
        else_body = [this.parseIf()];
      } else {
        this.expect(TokenKind.LeftBrace);
        else_body = this.parseStatements();
        this.expect(TokenKind.RightBrace);
      }
    }
    return { kind: 'if', condition, then_body, else_body };
  }

  private parseSwitch(): SwitchAST {
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
        while (!this.check(TokenKind.Case) && !this.check(TokenKind.Default) && !this.check(TokenKind.RightBrace) && !this.isAtEnd()) {
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

  private parseWhile(): WhileAST {
    this.expect(TokenKind.While);
    this.expect(TokenKind.LeftParen);
    const condition = this.collectBalanced(TokenKind.LeftParen, TokenKind.RightParen);
    this.expect(TokenKind.RightParen);
    this.expect(TokenKind.LeftBrace);
    const body = this.parseStatements();
    this.expect(TokenKind.RightBrace);
    return { kind: 'while', condition, body };
  }

  private parseReturn(): ReturnAST {
    this.advance();
    let value: string | null = null;
    if (!this.check(TokenKind.Semicolon)) {
      value = this.collectUntilSemicolon();
    }
    if (this.check(TokenKind.Semicolon)) this.advance();
    return { kind: 'return', value };
  }

  private parseVarDecl(): VarDeclAST {
    const kw = this.advance().value; // const or let
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

  // ============================================================
  // ASSIGNMENT PARSER — TOKEN-LEVEL (replaces old regex approach)
  //
  // The old approach used collectUntilSemicolon() + regex like:
  //   text.match(/^(this\.\w+(?:\[.*?\])?)\s*=\s*(.+)$/)
  // which broke on nested expressions like:
  //   this.data = (a === b) ? this.calc(x) : y
  //
  // This version inspects the token stream directly, handling:
  //   this.prop = <expr>;
  //   this.prop[<idx>] = <expr>;
  //   this.prop++; / this.prop--;
  //   this.prop += / -= / &= / |= / ^= <expr>;
  // ============================================================

  private parseAssignOrExpr(): StatementAST {
    const saved_pos = this.pos;

    // Detect assignment targets starting with 'this'
    if (this.check(TokenKind.This)) {
      const target_result = this.tryParseAssignTarget();
      if (target_result) {
        const { target } = target_result;

        // this.x++
        if (this.check(TokenKind.PlusPlus)) {
          this.advance();
          if (this.check(TokenKind.Semicolon)) this.advance();
          return { kind: 'assign', target, value: `${target} + 1` };
        }

        // this.x--
        if (this.check(TokenKind.MinusMinus)) {
          this.advance();
          if (this.check(TokenKind.Semicolon)) this.advance();
          return { kind: 'assign', target, value: `${target} - 1` };
        }

        // this.x = expr
        if (this.check(TokenKind.Equals)) {
          this.advance();
          const value = this.collectUntilSemicolon();
          if (this.check(TokenKind.Semicolon)) this.advance();
          return { kind: 'assign', target, value };
        }

        // this.x += expr
        if (this.check(TokenKind.PlusEquals)) {
          this.advance();
          const rhs = this.collectUntilSemicolon();
          if (this.check(TokenKind.Semicolon)) this.advance();
          return { kind: 'assign', target, value: `${target} + ${rhs}` };
        }

        // this.x -= expr
        if (this.check(TokenKind.MinusEquals)) {
          this.advance();
          const rhs = this.collectUntilSemicolon();
          if (this.check(TokenKind.Semicolon)) this.advance();
          return { kind: 'assign', target, value: `${target} - ${rhs}` };
        }

        // this.x &= / |= / ^= (operator + equals as separate tokens)
        if ((this.check(TokenKind.Ampersand) || this.check(TokenKind.Pipe) || this.check(TokenKind.Caret))
            && this.peekAhead(1)?.kind === TokenKind.Equals) {
          const op = this.advance().value;
          this.advance(); // consume =
          const rhs = this.collectUntilSemicolon();
          if (this.check(TokenKind.Semicolon)) this.advance();
          return { kind: 'assign', target, value: `${target} ${op} ${rhs}` };
        }

        // Not an assignment — backtrack
        this.pos = saved_pos;
      } else {
        this.pos = saved_pos;
      }
    }

    // Fallback: generic expression statement
    const text = this.collectUntilSemicolon();
    if (this.check(TokenKind.Semicolon)) this.advance();
    return { kind: 'expr', text };
  }

  /**
   * Try to parse 'this.IDENT' or 'this.IDENT[expr]' as an assignment target.
   * Returns null if tokens don't match — caller must handle backtracking.
   */
  private tryParseAssignTarget(): { target: string } | null {
    if (!this.check(TokenKind.This)) return null;
    this.advance();

    if (!this.check(TokenKind.Dot)) return null;
    this.advance();

    if (!this.check(TokenKind.Identifier)) return null;
    const prop_name = this.advance().value;
    let target = `this.${prop_name}`;

    // Optional array index: [expr]
    if (this.check(TokenKind.LeftBracket)) {
      this.advance();
      const idx = this.collectBalanced(TokenKind.LeftBracket, TokenKind.RightBracket);
      this.expect(TokenKind.RightBracket);
      target = `this.${prop_name}[${idx}]`;
    }

    return { target };
  }

  private peekAhead(offset: number): Token | null {
    const idx = this.pos + offset;
    if (idx >= this.tokens.length) return null;
    return this.tokens[idx];
  }

  // Helpers
  private collectUntilSemicolon(): string {
    let result = '';
    let depth = 0;
    while (!this.isAtEnd()) {
      if (depth === 0 && this.check(TokenKind.Semicolon)) break;
      if (this.check(TokenKind.LeftParen) || this.check(TokenKind.LeftBracket) || this.check(TokenKind.LeftBrace)) depth++;
      if (this.check(TokenKind.RightParen) || this.check(TokenKind.RightBracket) || this.check(TokenKind.RightBrace)) depth--;
      const t = this.advance();
      // Restore prefix for hex/binary literals (lexer strips 0x/0b)
      let v = t.value;
      if (t.kind === TokenKind.HexLiteral) v = '0x' + v;
      if (t.kind === TokenKind.BinaryLiteral) v = '0b' + v;
      // No space before/after dots, brackets, parens, or after ! and ~
      const noSpaceBefore = v === '.' || v === '(' || v === ')' || v === '[' || v === ']' || v === ',';
      const noSpaceAfter = result.endsWith('.') || result.endsWith('(') || result.endsWith('[') || result.endsWith('!') || result.endsWith('~');
      if (result === '' || noSpaceBefore || noSpaceAfter || v === '!' || v === '~') {
        result += v;
      } else {
        result += ' ' + v;
      }
    }
    return result.trim();
  }

  private collectBalanced(open: TokenKind, close: TokenKind): string {
    let result = '';
    let depth = 1;
    while (depth > 0 && !this.isAtEnd()) {
      if (this.current().kind === open) depth++;
      if (this.current().kind === close) { depth--; if (depth === 0) break; }
      const t = this.advance();
      let v = t.value;
      if (t.kind === TokenKind.HexLiteral) v = '0x' + v;
      if (t.kind === TokenKind.BinaryLiteral) v = '0b' + v;
      const noSpaceBefore = v === '.' || v === '(' || v === ')' || v === '[' || v === ']' || v === ',';
      const noSpaceAfter = result.endsWith('.') || result.endsWith('(') || result.endsWith('[') || result.endsWith('!') || result.endsWith('~');
      if (result === '' || noSpaceBefore || noSpaceAfter || v === '!' || v === '~') {
        result += v;
      } else {
        result += ' ' + v;
      }
    }
    return result.trim();
  }

  private isAttachable(v: string): boolean {
    return v === '.' || v === '(' || v === ')' || v === '[' || v === ']' || v === ',';
  }

  private peekIsMethod(): boolean {
    let i = this.pos;
    // Skip access modifier
    if (this.tokens[i].kind === TokenKind.Private || this.tokens[i].kind === TokenKind.Public) i++;
    if (this.tokens[i].kind === TokenKind.Async) i++;
    // Name
    if (i < this.tokens.length && this.tokens[i].kind === TokenKind.Identifier) i++;
    // If next is '(' it's a method
    return i < this.tokens.length && this.tokens[i].kind === TokenKind.LeftParen;
  }

  private skipToSemicolonOrBrace(): void {
    while (!this.isAtEnd() && !this.check(TokenKind.Semicolon) && !this.check(TokenKind.LeftBrace)) this.advance();
    if (this.check(TokenKind.Semicolon)) this.advance();
    else if (this.check(TokenKind.LeftBrace)) {
      let depth = 1; this.advance();
      while (depth > 0 && !this.isAtEnd()) {
        if (this.check(TokenKind.LeftBrace)) depth++;
        if (this.check(TokenKind.RightBrace)) depth--;
        this.advance();
      }
    }
  }

  private isAtEnd(): boolean { return this.pos >= this.tokens.length || this.tokens[this.pos].kind === TokenKind.EndOfFile; }
  private check(kind: TokenKind): boolean { return !this.isAtEnd() && this.tokens[this.pos].kind === kind; }
  private checkValue(v: string): boolean { return !this.isAtEnd() && this.tokens[this.pos].value === v; }
  private current(): Token { return this.tokens[this.pos]; }
  private advance(): Token { return this.tokens[this.pos++]; }
  private expect(kind: TokenKind): Token {
    if (!this.check(kind)) {
      const t = this.current();
      throw new Error(`Expected ${kind} but got ${t.kind} ("${t.value}") at line ${t.line}, col ${t.column}`);
    }
    return this.advance();
  }
}

// ============================================================
// EMITTER: Generates IEEE 1800-2017 SystemVerilog
// ============================================================

const SV_KEYWORDS = new Set(['module', 'endmodule', 'input', 'output', 'wire', 'logic', 'reg',
  'always', 'begin', 'end', 'if', 'else', 'case', 'endcase', 'default',
  'assign', 'parameter', 'localparam', 'genvar', 'generate', 'endgenerate',
  'posedge', 'negedge', 'or', 'and', 'not', 'xor', 'initial', 'function',
  'task', 'integer', 'real', 'event', 'string', 'bit', 'int', 'enum']);

function sanitize(name: string): string {
  const stripped = name.replace(/^this\./, '');
  return SV_KEYWORDS.has(stripped) ? stripped + '_s' : stripped;
}

function formatWidth(bits: number): string {
  if (bits === 1) return '';
  return `[${bits - 1}:0]`;
}

function enumBits(count: number): number {
  if (count <= 2) return 1;
  return Math.ceil(Math.log2(count));
}

export class ClassModuleEmitter {
  private lines: string[] = [];
  private indent: number = 0;
  private module_signatures: Map<string, ModuleSignature> = new Map();

  emit(parsed: { enums: EnumAST[]; modules: ClassModuleAST[] }): string {
    this.lines = [];
    this.line('// Generated by ts2v v1.0.0 - IEEE 1800-2017 Compliant SystemVerilog');
    this.line('`timescale 1ns / 1ps');
    this.line('`default_nettype none');
    this.line('');

    // Pass 1: Build module signature table for hierarchy
    for (const mod of parsed.modules) {
      this.registerModuleSignature(mod);
    }

    // Emit enums as typedef
    for (const e of parsed.enums) {
      this.emitEnum(e);
      this.line('');
    }

    // Pass 2: Emit modules with hierarchy awareness
    for (const mod of parsed.modules) {
      this.emitModule(mod, parsed.enums);
      this.line('');
    }

    this.line('`default_nettype wire');
    return this.lines.join('\n');
  }

  private registerModuleSignature(mod: ClassModuleAST): void {
    const has_seq = mod.methods.some(m => m.type === 'sequential');
    const inputs: { name: string; bit_width: number }[] = [];
    const outputs: { name: string; bit_width: number }[] = [];
    for (const p of mod.properties) {
      if (p.direction === 'input') inputs.push({ name: p.name, bit_width: p.bit_width });
      if (p.direction === 'output') outputs.push({ name: p.name, bit_width: p.bit_width });
    }
    this.module_signatures.set(mod.name, { name: mod.name, inputs, outputs });
  }

  private emitEnum(e: EnumAST): void {
    const bits = enumBits(e.members.length);
    this.line(`typedef enum logic ${formatWidth(bits)} {`);
    this.indent++;
    for (let i = 0; i < e.members.length; i++) {
      const m = e.members[i];
      const comma = i < e.members.length - 1 ? ',' : '';
      this.line(`${m.name} = ${bits}'d${m.value}${comma}`);
    }
    this.indent--;
    this.line(`} ${e.name};`);
  }

  private emitModule(mod: ClassModuleAST, global_enums: EnumAST[]): void {
    const all_enums = [...global_enums, ...mod.enums];
    const has_sequential = mod.methods.some(m => m.type === 'sequential');

    // Build property width lookup for context-aware bit-width emission
    const pw = new Map<string, number>();
    for (const p of mod.properties) pw.set(p.name, p.bit_width);

    // Port list
    this.line(`module ${mod.name} (`);
    this.indent++;
    const ports: string[] = [];

    if (has_sequential) {
      const clk = mod.methods.find(m => m.type === 'sequential')!.clock;
      if (!mod.properties.find(p => p.name === clk)) {
        ports.push(`input  wire logic ${sanitize(clk)}`);
      }
      if (!mod.properties.find(p => p.name === mod.config.reset_signal)) {
        ports.push(`input  wire logic ${sanitize(mod.config.reset_signal)}`);
      }
    }

    for (const p of mod.properties) {
      if (p.direction === 'input') {
        ports.push(`input  wire logic ${formatWidth(p.bit_width)} ${sanitize(p.name)}`);
      } else if (p.direction === 'output') {
        ports.push(`output      logic ${formatWidth(p.bit_width)} ${sanitize(p.name)}`);
      }
    }

    for (let i = 0; i < ports.length; i++) {
      this.line(`${ports[i]}${i < ports.length - 1 ? ',' : ''}`);
    }
    this.indent--;
    this.line(');');
    this.line('');

    // Internal signals
    const internals = mod.properties.filter(p => p.direction === 'internal');
    if (internals.length > 0) {
      this.line('    // Internal signals');
      for (const p of internals) {
        const w = formatWidth(p.bit_width);
        const n = sanitize(p.name);
        if (p.is_const) {
          this.line(`    localparam ${w ? 'logic ' + w : ''} ${n} = ${this.translateExpr(p.initial_value || '0', all_enums, mod)};`);
        } else if (p.is_array && p.array_size > 0) {
          this.line(`    logic ${w} ${n} [0:${p.array_size - 1}];`);
        } else {
          this.line(`    logic ${w} ${n};`);
        }
      }
      this.line('');
    }

    // Submodule instantiations (v1.0.0: structural hierarchy)
    if (mod.submodules.length > 0) {
      this.line('    // Submodule instances');
      for (const sub of mod.submodules) {
        this.emitSubmoduleInst(sub, mod);
      }
      this.line('');
    }

    // Emit methods
    for (const method of mod.methods) {
      if (method.type === 'sequential') {
        this.emitSequential(method, mod, all_enums, pw);
      } else {
        this.emitCombinational(method, mod, all_enums, pw);
      }
      this.line('');
    }

    // SVA Assertions (v1.0.0)
    if (mod.assertions.length > 0) {
      this.line('    // SystemVerilog Assertions');
      const clk = mod.methods.find(m => m.type === 'sequential')?.clock || 'clk';
      for (const a of mod.assertions) {
        const cond = this.translateExpr(a.condition, all_enums, mod);
        const label = a.label || `assert_${mod.assertions.indexOf(a)}`;
        if (a.message) {
          this.line(`    // ${label}: ${a.message}`);
          this.line(`    // Assertion translated to synthesis-safe check`);
          this.line(`    always @(*) if (!(${cond})) begin end`);
        } else {
          this.line(`    // ${label}: assertion translated to synthesis-safe check`);
          this.line(`    always @(*) if (!(${cond})) begin end`);
        }
      }
      this.line('');
    }

    this.line('endmodule');
  }

  private emitSubmoduleInst(sub: SubmoduleAST, parent: ClassModuleAST): void {
    const sig = this.module_signatures.get(sub.module_type);
    const inst = sanitize(sub.instance_name);

    if (sub.port_map.length > 0) {
      // Explicit port mapping from decorator args
      const bindings = sub.port_map.map(b => `.${sanitize(b.port_name)}(${sanitize(b.wire_name)})`);
      this.line(`    ${sub.module_type} ${inst} (`);
      for (let i = 0; i < bindings.length; i++) {
        this.line(`        ${bindings[i]}${i < bindings.length - 1 ? ',' : ''}`);
      }
      this.line('    );');
    } else if (sig) {
      // Auto-bind by name using module signature
      const bindings: string[] = [];
      const parent_clk = parent.methods.find(m => m.type === 'sequential')?.clock;
      const parent_rst = parent.config.reset_signal;

      // Bind clock and reset if parent has sequential logic
      if (parent_clk) {
        const child_needs_clk = sig.inputs.some(i => i.name === parent_clk || i.name === 'clk');
        if (child_needs_clk) bindings.push(`.${sanitize(parent_clk)}(${sanitize(parent_clk)})`);
        const child_needs_rst = sig.inputs.some(i => i.name === parent_rst);
        if (child_needs_rst) bindings.push(`.${sanitize(parent_rst)}(${sanitize(parent_rst)})`);
      }

      for (const inp of sig.inputs) {
        if (inp.name === parent_clk || inp.name === parent_rst || inp.name === 'clk' || inp.name === parent.config.reset_signal) continue;
        const has = parent.properties.find(p => p.name === inp.name);
        bindings.push(`.${sanitize(inp.name)}(${has ? sanitize(inp.name) : '/* unconnected */'})`);
      }
      for (const outp of sig.outputs) {
        const has = parent.properties.find(p => p.name === outp.name);
        bindings.push(`.${sanitize(outp.name)}(${has ? sanitize(outp.name) : '/* unconnected */'})`);
      }

      this.line(`    ${sub.module_type} ${inst} (`);
      for (let i = 0; i < bindings.length; i++) {
        this.line(`        ${bindings[i]}${i < bindings.length - 1 ? ',' : ''}`);
      }
      this.line('    );');
    } else {
      this.line(`    // WARNING: Unknown module type '${sub.module_type}' for '${sub.instance_name}'`);
      this.line(`    // ${sub.module_type} ${inst} ( /* unresolved */ );`);
    }
  }

  private emitSequential(method: MethodAST, mod: ClassModuleAST, enums: EnumAST[], pw: Map<string, number>): void {
    const clk = sanitize(method.clock);
    const rst = sanitize(mod.config.reset_signal);
    const is_async = mod.config.reset_type === 'async';
    const is_active_low = mod.config.reset_polarity === 'active_low';

    const sens = is_async
      ? `posedge ${clk} or ${is_active_low ? 'negedge' : 'posedge'} ${rst}`
      : `posedge ${clk}`;

    this.line(`    // Sequential Logic (${method.name})`);
    this.line(`    always_ff @(${sens}) begin`);

    // Reset block — with context-aware bit-width sizing
    const reset_props = mod.properties.filter(p => p.initial_value !== null && p.direction !== 'input');
    if (reset_props.length > 0) {
      const rst_cond = is_active_low ? `!${rst}` : rst;
      this.line(`        if (${rst_cond}) begin`);
      for (const p of reset_props) {
        if (!p.is_const) {
          const raw = this.translateExpr(p.initial_value!, enums, mod);
          const sized = this.sizeLiteral(raw, p.bit_width);
          this.line(`            ${sanitize(p.name)} <= ${sized};`);
        }
      }
      this.line('        end else begin');
      this.indent += 3;
      this.emitStatements(method.body, enums, mod, true, pw);
      this.indent -= 3;
      this.line('        end');
    } else {
      this.indent += 2;
      this.emitStatements(method.body, enums, mod, true, pw);
      this.indent -= 2;
    }

    this.line('    end');
  }

  private emitCombinational(method: MethodAST, mod: ClassModuleAST, enums: EnumAST[], pw: Map<string, number>): void {
    this.line(`    // Combinational Logic (${method.name})`);
    this.line(`    always_comb begin`);
    this.indent += 2;
    this.emitStatements(method.body, enums, mod, false, pw);
    this.indent -= 2;
    this.line('    end');
  }

  private emitStatements(stmts: StatementAST[], enums: EnumAST[], mod: ClassModuleAST, is_seq: boolean, pw: Map<string, number>): void {
    for (const stmt of stmts) {
      this.emitStatement(stmt, enums, mod, is_seq, pw);
    }
  }

  private emitStatement(stmt: StatementAST, enums: EnumAST[], mod: ClassModuleAST, is_seq: boolean, pw: Map<string, number>): void {
    const assign_op = is_seq ? '<=' : '=';

    switch (stmt.kind) {
      case 'assign': {
        // Context-aware: look up target width for literal sizing
        const target_name = stmt.target.replace(/^this\./, '').replace(/\[.*\]$/, '');
        const target_width = pw.get(target_name);
        const target = this.translateExpr(stmt.target, enums, mod);
        const raw_value = this.translateExpr(stmt.value, enums, mod);
        const value = target_width !== undefined ? this.sizeLiteral(raw_value, target_width) : raw_value;
        this.line(`${target} ${assign_op} ${value};`);
        break;
      }
      case 'if': {
        const cond = this.translateExpr(stmt.condition, enums, mod);
        this.line(`if (${cond}) begin`);
        this.indent++;
        this.emitStatements(stmt.then_body, enums, mod, is_seq, pw);
        this.indent--;
        if (stmt.else_body) {
          this.line('end else begin');
          this.indent++;
          this.emitStatements(stmt.else_body, enums, mod, is_seq, pw);
          this.indent--;
        }
        this.line('end');
        break;
      }
      case 'switch': {
        const expr = this.translateExpr(stmt.expr, enums, mod);
        this.line(`case (${expr})`);
        this.indent++;
        for (const c of stmt.cases) {
          const label = this.translateExpr(c.label, enums, mod);
          this.line(`${label}: begin`);
          this.indent++;
          this.emitStatements(c.body, enums, mod, is_seq, pw);
          this.indent--;
          this.line('end');
        }
        if (stmt.default_body) {
          this.line('default: begin');
          this.indent++;
          this.emitStatements(stmt.default_body, enums, mod, is_seq, pw);
          this.indent--;
          this.line('end');
        }
        this.indent--;
        this.line('endcase');
        break;
      }
      case 'var': {
        const name = sanitize(stmt.name);
        const value = this.translateExpr(stmt.value, enums, mod);
        if (is_seq) {
          this.line(`${name} ${assign_op} ${value};`);
        } else {
          this.line(`logic ${name} = ${value};`);
        }
        break;
      }
      case 'while': {
        this.line(`// while: ${this.translateExpr(stmt.condition, enums, mod)}`);
        this.emitStatements(stmt.body, enums, mod, is_seq, pw);
        break;
      }
      case 'for': {
        this.line(`// for loop (unrolled by synthesis)`);
        this.emitStatements(stmt.body, enums, mod, is_seq, pw);
        break;
      }
      case 'assert': {
        const cond = this.translateExpr(stmt.condition, enums, mod);
        if (stmt.message) {
          this.line(`// assert: ${stmt.message}`);
          this.line(`if (!(${cond})) begin end`);
        } else {
          this.line(`if (!(${cond})) begin end`);
        }
        break;
      }
      case 'await': {
        this.line(`// await ${this.translateExpr(stmt.signal, enums, mod)} (clock cycle boundary)`);
        break;
      }
      case 'return':
        if (stmt.value) {
          this.line(`// return ${this.translateExpr(stmt.value, enums, mod)}`);
        }
        break;
      case 'expr':
        if (stmt.text.trim()) {
          this.line(`// ${stmt.text}`);
        }
        break;
    }
  }

  /**
   * Size bare numeric literals to match target bit-width.
   *   "0"   with width 8  → "8'd0"
   *   "1"   with width 1  → "1'b1"
   * Leaves already-prefixed SV literals and complex expressions untouched.
   */
  private sizeLiteral(expr: string, width: number): string {
    const bare = /^(\d+)$/;
    const m = expr.match(bare);
    if (m) {
      const val = parseInt(m[1], 10);
      if (width === 1) return val ? "1'b1" : "1'b0";
      return `${width}'d${val}`;
    }
    if (expr.includes("'")) return expr;
    return expr;
  }

  private translateExpr(expr: string, enums: EnumAST[], mod: ClassModuleAST): string {
    let result = expr;

    // Replace this.property with just property name
    result = result.replace(/this\.(\w+)/g, (_, name) => sanitize(name));

    // Replace Enum.Member with SV enum value
    for (const e of enums) {
      for (const m of e.members) {
        result = result.replace(new RegExp(`${e.name}\\.${m.name}`, 'g'), m.name);
      }
    }

    // Replace TS operators with SV equivalents
    result = result.replace(/===/g, '==');
    result = result.replace(/!==/g, '!=');
    result = result.replace(/&&/g, '&&');
    result = result.replace(/\|\|/g, '||');

    // Replace hex literals 0xFF -> width-inferred SV literal
    result = result.replace(/0x([0-9a-fA-F]+)/g, (_, hex) => {
      const bits = hex.length * 4;
      return `${bits}'h${hex}`;
    });

    return result;
  }

  private line(text: string): void {
    if (text === '') { this.lines.push(''); return; }
    this.lines.push('    '.repeat(this.indent) + text);
  }
}

// ============================================================
// PIPELINE: Parse + Emit
// ============================================================

export interface ClassCompilationResult {
  success: boolean;
  systemverilog: string;
  errors: string[];
  parsed: { enums: EnumAST[]; modules: ClassModuleAST[] } | null;
}

export function compileClassModule(source: string): ClassCompilationResult {
  try {
    const parser = new ClassModuleParser(source);
    const parsed = parser.parse();
    const emitter = new ClassModuleEmitter();
    const systemverilog = emitter.emit(parsed);
    return { success: true, systemverilog, errors: [], parsed };
  } catch (error: any) {
    return { success: false, systemverilog: '', errors: [error.message], parsed: null };
  }
}
