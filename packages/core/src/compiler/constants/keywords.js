"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERILOG_ESCAPE_SUFFIX = exports.VERILOG_RESERVED_WORDS = exports.TYPESCRIPT_KEYWORDS = void 0;
// TypeScript keywords recognized by the transpiler (MVP subset).
exports.TYPESCRIPT_KEYWORDS = new Set([
    'const', 'let', 'function', 'return', 'if', 'else',
    'number', 'boolean', 'true', 'false', 'export',
]);
// Verilog reserved words that must be escaped if used as identifiers.
exports.VERILOG_RESERVED_WORDS = new Set([
    'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg',
    'assign', 'always', 'begin', 'end', 'if', 'else', 'case', 'endcase',
    'default', 'posedge', 'negedge', 'parameter', 'localparam', 'integer',
    'genvar', 'generate', 'endgenerate', 'function', 'endfunction',
    'task', 'endtask', 'initial', 'forever', 'for', 'while', 'repeat',
    'or', 'and', 'not', 'xor', 'nand', 'nor', 'xnor', 'buf',
    'supply0', 'supply1', 'tri', 'triand', 'trior', 'tri0', 'tri1',
    'time', 'realtime', 'event', 'string', 'rand', 'randc',
    'priority', 'unique', 'bit', 'logic', 'byte', 'shortint', 'int',
    'longint', 'real', 'shortreal', 'void',
]);
// Suffix appended to identifiers that collide with Verilog reserved words.
exports.VERILOG_ESCAPE_SUFFIX = '_v';
//# sourceMappingURL=keywords.js.map