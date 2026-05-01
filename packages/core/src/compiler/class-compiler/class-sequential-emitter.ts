// Sequential and combinational logic emission for ClassModuleEmitter.
// Handles always_ff, always_comb, var decls, and statement translation.
// Supports helper method inlining and early-return -> else-clause transformation.

import { EnumAST, ClassModuleAST, MethodAST, StatementAST, VarDeclAST } from './class-module-ast';
import { sanitize, formatWidth } from './class-sv-helpers';
import { EmitterBase } from './class-emitter-base';

export class SequentialEmitter extends EmitterBase {
    // --------------------------------------------------------------------------
    // Body preprocessing: inline helper calls then eliminate early returns.
    // These transforms run once on the compiled body before any SV is emitted.
    // --------------------------------------------------------------------------

    private inlineHelpers(stmts: StatementAST[], helpers: Record<string, StatementAST[]>): StatementAST[] {
        return stmts.flatMap(stmt => {
            if (stmt.kind === 'call') {
                const body = helpers[stmt.method];
                if (!body) return [{ kind: 'expr', text: `/* unknown helper: ${stmt.method} */` }];
                return this.inlineHelpers(body, helpers);
            }
            if (stmt.kind === 'if') return [{
                ...stmt,
                then_body: this.inlineHelpers(stmt.then_body, helpers),
                else_body: stmt.else_body ? this.inlineHelpers(stmt.else_body, helpers) : null,
            }];
            if (stmt.kind === 'switch') return [{
                ...stmt,
                cases: stmt.cases.map(c => ({ ...c, body: this.inlineHelpers(c.body, helpers) })),
                default_body: stmt.default_body ? this.inlineHelpers(stmt.default_body, helpers) : null,
            }];
            return [stmt];
        });
    }

    // Convert early returns into else clauses:
    //   if (cond) { ...; return; }   rest...
    //   ->  if (cond) { ... } else { rest... }
    // Works recursively so nested guards are handled bottom-up.
    private eliminateReturns(stmts: StatementAST[]): StatementAST[] {
        const result: StatementAST[] = [];
        for (let i = 0; i < stmts.length; i++) {
            const stmt = stmts[i];
            if (stmt.kind === 'if') {
                const newThen = this.eliminateReturns(stmt.then_body);
                const newElse = stmt.else_body ? this.eliminateReturns(stmt.else_body) : null;
                const lastThen = newThen[newThen.length - 1];
                if (lastThen?.kind === 'return' && newElse === null) {
                    // Guard pattern: move remaining stmts into else
                    const thenNoReturn = newThen.slice(0, -1);
                    const remaining = this.eliminateReturns(stmts.slice(i + 1));
                    result.push({
                        ...stmt,
                        then_body: thenNoReturn,
                        else_body: remaining.length > 0 ? remaining : null,
                    });
                    break;
                }
                result.push({ ...stmt, then_body: newThen, else_body: newElse });
            } else {
                result.push(stmt);
            }
        }
        return result;
    }

    private preprocessBody(stmts: StatementAST[], helpers: Record<string, StatementAST[]>): StatementAST[] {
        return this.eliminateReturns(this.inlineHelpers(stmts, helpers));
    }
    // Collect all signal names used in rising(this.X) or falling(this.X) calls
    // across the entire method body (used for prev_X register generation).
    private collectEdgeSignals(stmts: StatementAST[]): Set<string> {
        const sigs = new Set<string>();
        const pattern = /(?:rising|falling)\(\s*this\.(\w+)\s*\)/g;
        const scanStr = (s: string) => {
            let m: RegExpExecArray | null;
            while ((m = pattern.exec(s)) !== null) sigs.add(m[1]);
            pattern.lastIndex = 0;
        };
        const walk = (ss: StatementAST[]) => {
            for (const s of ss) {
                if (s.kind === 'assign') { scanStr(s.value); scanStr(s.target); }
                if (s.kind === 'if') { scanStr(s.condition); walk(s.then_body); if (s.else_body) walk(s.else_body); }
                if (s.kind === 'switch') { scanStr(s.expr); for (const c of s.cases) walk(c.body); if (s.default_body) walk(s.default_body); }
                if (s.kind === 'var') scanStr(s.value);
                if (s.kind === 'expr') scanStr(s.text);
            }
        };
        walk(stmts);
        return sigs;
    }

    protected emitSequential(
        method: MethodAST,
        mod: ClassModuleAST,
        enums: EnumAST[],
        pw: Map<string, number>
    ): void {
        const clk = sanitize(method.clock);
        const rst = sanitize(mod.config.reset_signal);
        const has_declared_reset =
            mod.properties.some(p => p.direction === 'input' && p.name === mod.config.reset_signal) ||
            (mod.config.reset_type === 'async' && mod.config.reset_signal !== 'no_rst');
        const is_async = mod.config.reset_type === 'async';
        const is_active_low = mod.config.reset_polarity === 'active_low';

        const body = this.preprocessBody(method.body, mod.helpers ?? {});

        const localVars = this.collectVarDecls(body);
        const emittedLocalNames = new Set<string>();
        if (localVars.length > 0) {
            this.line('    // Method-local registers (synthesized at module scope)');
            for (const v of localVars) {
                const vname = sanitize(v.name);
                if (emittedLocalNames.has(vname)) continue;
                emittedLocalNames.add(vname);
                const width = this.resolveLocalVarWidth(v, pw);
                this.line(`    logic ${formatWidth(width)} ${vname};`);
                pw.set(v.name, width);
            }
            this.line('');
        }

        const edgeSignals = this.collectEdgeSignals(body);
        for (const sig of edgeSignals) {
            const sname = sanitize(sig);
            this.line(`    logic prev_${sname};`);
        }
        if (edgeSignals.size > 0) this.line('');

        const sens = is_async && has_declared_reset
            ? `posedge ${clk} or ${is_active_low ? 'negedge' : 'posedge'} ${rst}`
            : `posedge ${clk}`;

        this.line(`    // Sequential Logic (${method.name})`);
        this.line(`    always_ff @(${sens}) begin`);

        const reset_props = mod.properties.filter(p => p.initial_value !== null && p.direction !== 'input');
        if (has_declared_reset && reset_props.length > 0) {
            const rst_cond = is_active_low ? `!${rst}` : rst;
            this.line(`        if (${rst_cond}) begin`);
            for (const p of reset_props) {
                if (!p.is_const) {
                    const raw = this.translateExpr(p.initial_value!, enums, mod);
                    const sized = this.sizeLiteral(raw, p.bit_width);
                    this.line(`            ${sanitize(p.name)} <= ${sized};`);
                }
            }
            for (const sig of edgeSignals) {
                this.line(`            prev_${sanitize(sig)} <= 1'b0;`);
            }
            this.line('        end else begin');
            this.indent += 3;
            for (const sig of edgeSignals) {
                this.line(`prev_${sanitize(sig)} <= ${sanitize(sig)};`);
            }
            this.emitStatements(body, enums, mod, true, pw);
            this.indent -= 3;
            this.line('        end');
        } else {
            this.indent += 2;
            for (const sig of edgeSignals) {
                this.line(`prev_${sanitize(sig)} <= ${sanitize(sig)};`);
            }
            this.emitStatements(body, enums, mod, true, pw);
            this.indent -= 2;
        }

        this.line('    end');
    }

    protected emitCombinational(
        method: MethodAST,
        mod: ClassModuleAST,
        enums: EnumAST[],
        pw: Map<string, number>
    ): void {
        const body = this.preprocessBody(method.body, mod.helpers ?? {});
        this.line(`    // Combinational Logic (${method.name})`);
        this.line(`    always_comb begin`);
        this.indent += 2;
        this.emitStatements(body, enums, mod, false, pw);
        this.indent -= 2;
        this.line('    end');
    }

    protected collectVarDecls(stmts: StatementAST[]): VarDeclAST[] {
        const decls: VarDeclAST[] = [];
        for (const stmt of stmts) {
            if (stmt.kind === 'var') decls.push(stmt);
            if (stmt.kind === 'if') {
                decls.push(...this.collectVarDecls(stmt.then_body));
                if (stmt.else_body) decls.push(...this.collectVarDecls(stmt.else_body));
            }
            if (stmt.kind === 'switch') {
                for (const c of stmt.cases) decls.push(...this.collectVarDecls(c.body));
                if (stmt.default_body) decls.push(...this.collectVarDecls(stmt.default_body));
            }
            if (stmt.kind === 'while') decls.push(...this.collectVarDecls(stmt.body));
            if (stmt.kind === 'for') decls.push(...this.collectVarDecls(stmt.body));
        }
        return decls;
    }

    private resolveLocalVarWidth(varDecl: VarDeclAST, pw: Map<string, number>): number {
        if (varDecl.type) {
            const logicM = varDecl.type.match(/[Ll]ogic\s*<\s*(\d+)\s*>/);
            if (logicM) return parseInt(logicM[1], 10);
            const uintM = varDecl.type.match(/[Uu][Ii]nt(\d+)/);
            if (uintM) return parseInt(uintM[1], 10);
            if (varDecl.type.trim() === 'Bit' || varDecl.type.trim() === 'boolean') return 1;
        }
        const propRef = varDecl.value.match(/^this\.(\w+)$/);
        if (propRef) {
            const w = pw.get(propRef[1]);
            if (w !== undefined) return w;
        }
        if (/&\s*1\s*$/.test(varDecl.value.trim())) return 1;
        return 32;
    }

    private emitStatements(
        stmts: StatementAST[],
        enums: EnumAST[],
        mod: ClassModuleAST,
        is_seq: boolean,
        pw: Map<string, number>
    ): void {
        for (const stmt of stmts) {
            this.emitStatement(stmt, enums, mod, is_seq, pw);
        }
    }

    private emitStatement(
        stmt: StatementAST,
        enums: EnumAST[],
        mod: ClassModuleAST,
        is_seq: boolean,
        pw: Map<string, number>
    ): void {
        const assign_op = is_seq ? '<=' : '=';

        switch (stmt.kind) {
            case 'assign': {
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
                const raw_value = this.translateExpr(stmt.value, enums, mod);
                const var_width = pw.get(stmt.name);
                const value = var_width !== undefined ? this.sizeLiteral(raw_value, var_width) : raw_value;
                if (is_seq) {
                    this.line(`${name} ${assign_op} ${value};`);
                } else {
                    this.line(`logic ${formatWidth(var_width ?? 0)} ${name} = ${value};`);
                }
                break;
            }
            case 'while':
                this.line(`// while: ${this.translateExpr(stmt.condition, enums, mod)}`);
                this.emitStatements(stmt.body, enums, mod, is_seq, pw);
                break;
            case 'for':
                this.line('// for loop (unrolled by synthesis)');
                this.emitStatements(stmt.body, enums, mod, is_seq, pw);
                break;
            case 'assert': {
                const cond = this.translateExpr(stmt.condition, enums, mod);
                this.line(stmt.message
                    ? `assert (${cond}) else $error("${stmt.message}");`
                    : `assert (${cond});`);
                break;
            }
            case 'await':
                this.line(`// await ${this.translateExpr(stmt.signal, enums, mod)} (clock cycle boundary)`);
                break;
            case 'return':
                if (stmt.value) this.line(`// return ${this.translateExpr(stmt.value, enums, mod)}`);
                break;
            case 'expr':
                if (stmt.text.trim()) this.line(`// ${stmt.text}`);
                break;
            case 'call':
                // Inlining should have resolved all calls before emission.
                // If a call survives here, the helper was not found.
                this.line(`/* unresolved call: ${stmt.method}() */`);
                break;
        }
    }
}
