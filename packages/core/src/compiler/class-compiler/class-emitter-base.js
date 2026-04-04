"use strict";
// Emitter base: line/indent utilities, literal sizing, and expression translation.
// ClassModuleEmitter inherits from this to keep structural and sequential
// emitters within the 285-line limit.
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmitterBase = void 0;
const class_sv_helpers_1 = require("./class-sv-helpers");
class EmitterBase {
    lines = [];
    indent = 0;
    // Top-level const values for inline substitution in expressions.
    global_consts = new Map();
    line(text) {
        if (text === '') {
            this.lines.push('');
            return;
        }
        this.lines.push('    '.repeat(this.indent) + text);
    }
    // Size bare numeric literals to match target bit-width.
    //   "0" with width 8 -> "8'd0"
    //   "1" with width 1 -> "1'b1"
    //   "8'h3f" with width 6 -> "6'h3f"  (resize pre-sized SV literal)
    // Leaves complex expressions untouched.
    sizeLiteral(expr, width) {
        const bareM = expr.match(/^(\d+)$/);
        if (bareM) {
            const val = parseInt(bareM[1], 10);
            if (width === 1)
                return val ? "1'b1" : "1'b0";
            return `${width}'d${val}`;
        }
        const svLitM = expr.match(/^(\d+)'([bBhHdD])([0-9a-fA-F_xzXZ]+)$/);
        if (svLitM) {
            return `${width}'${svLitM[2].toLowerCase()}${svLitM[3]}`;
        }
        if (expr.includes("'"))
            return expr;
        return expr;
    }
    translateExpr(expr, enums, mod) {
        let result = expr;
        result = result.replace(/this\.(\w+)/g, (_, name) => (0, class_sv_helpers_1.sanitize)(name));
        // Substitute top-level const identifiers with their raw values before
        // hex/operator translation so they get properly sized in SV context.
        for (const [cname, cvalue] of this.global_consts) {
            result = result.replace(new RegExp(`\\b${cname}\\b`, 'g'), cvalue);
        }
        for (const e of enums) {
            for (const m of e.members) {
                result = result.replace(new RegExp(`${e.name}\\.${m.name}`, 'g'), m.name);
            }
        }
        result = result.replace(/===/g, '==');
        result = result.replace(/!==/g, '!=');
        result = result.replace(/&&/g, '&&');
        result = result.replace(/\|\|/g, '||');
        result = result.replace(/Bits\.slice\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, (_, src, msb, lsb) => `${src.trim()}[${msb.trim()}:${lsb.trim()}]`);
        result = result.replace(/Bits\.bit\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, (_, src, idx) => `${src.trim()}[${idx.trim()}]`);
        result = result.replace(/0x([0-9a-fA-F]+)/g, (_, hex) => {
            const bits = hex.length * 4;
            return `${bits}'h${hex}`;
        });
        return result;
    }
}
exports.EmitterBase = EmitterBase;
//# sourceMappingURL=class-emitter-base.js.map