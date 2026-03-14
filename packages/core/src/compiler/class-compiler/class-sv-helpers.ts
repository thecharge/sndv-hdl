// SystemVerilog keyword table and pure helper functions.
// No class state; safe to import from any emitter file.

export const SV_KEYWORDS = new Set([
    'module', 'endmodule', 'input', 'output', 'wire', 'logic', 'reg',
    'always', 'begin', 'end', 'if', 'else', 'case', 'endcase', 'default',
    'assign', 'parameter', 'localparam', 'genvar', 'generate', 'endgenerate',
    'posedge', 'negedge', 'or', 'and', 'not', 'xor', 'initial', 'function',
    'task', 'integer', 'real', 'event', 'string', 'bit', 'int', 'enum',
]);

export function sanitize(name: string): string {
    const stripped = name.replace(/^this\./, '');
    return SV_KEYWORDS.has(stripped) ? stripped + '_s' : stripped;
}

export function formatWidth(bits: number): string {
    if (bits === 1) return '';
    return `[${bits - 1}:0]`;
}

export function enumBits(count: number): number {
    if (count <= 2) return 1;
    return Math.ceil(Math.log2(count));
}
