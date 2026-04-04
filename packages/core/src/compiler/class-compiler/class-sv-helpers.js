"use strict";
// SystemVerilog keyword table and pure helper functions.
// No class state; safe to import from any emitter file.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SV_KEYWORDS = void 0;
exports.sanitize = sanitize;
exports.formatWidth = formatWidth;
exports.enumBits = enumBits;
exports.SV_KEYWORDS = new Set([
    'module', 'endmodule', 'input', 'output', 'wire', 'logic', 'reg',
    'always', 'begin', 'end', 'if', 'else', 'case', 'endcase', 'default',
    'assign', 'parameter', 'localparam', 'genvar', 'generate', 'endgenerate',
    'posedge', 'negedge', 'or', 'and', 'not', 'xor', 'initial', 'function',
    'task', 'integer', 'real', 'event', 'string', 'bit', 'int', 'enum',
]);
function sanitize(name) {
    const stripped = name.replace(/^this\./, '');
    return exports.SV_KEYWORDS.has(stripped) ? stripped + '_s' : stripped;
}
function formatWidth(bits) {
    if (bits === 1)
        return '';
    return `[${bits - 1}:0]`;
}
function enumBits(count) {
    if (count <= 2)
        return 1;
    return Math.ceil(Math.log2(count));
}
//# sourceMappingURL=class-sv-helpers.js.map