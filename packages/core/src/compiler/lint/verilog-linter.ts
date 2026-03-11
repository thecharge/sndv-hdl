// Verilog structural linter: validates generated output is syntactically sound.
// Checks module structure, port syntax, assign statements, balanced delimiters,
// correct literal formats, and IEEE 1800-2017 compliance markers.

export interface LintDiagnostic {
  readonly line_number: number;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly rule: string;
}

export function lintVerilog(verilog_source: string): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];
  const lines = verilog_source.split('\n');

  let module_depth = 0;
  let paren_depth = 0;
  let in_port_list = false;
  let has_timescale = false;
  let has_default_nettype_none = false;
  let has_default_nettype_wire = false;
  let current_module = '';
  let module_assign_targets = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const line_number = i + 1;

    // --- File-level directives ---
    if (trimmed.startsWith('`timescale')) has_timescale = true;
    if (trimmed === '`default_nettype none') has_default_nettype_none = true;
    if (trimmed === '`default_nettype wire') has_default_nettype_wire = true;

    // --- Module open/close ---
    if (trimmed.startsWith('module ')) {
      if (module_depth > 0) {
        diagnostics.push({ line_number, severity: 'error', message: `Nested module inside "${current_module}"`, rule: 'no-nested-module' });
      }
      module_depth++;
      current_module = trimmed.split(/\s+/)[1] || '(unknown)';
      in_port_list = trimmed.includes('(');
      if (trimmed.includes(')')) in_port_list = false;
    }

    if (trimmed === 'endmodule') {
      // Check for multiply-driven nets before closing module
      for (const [target, count] of module_assign_targets) {
        if (count > 1) {
          diagnostics.push({ line_number, severity: 'error', message: `Multiply-driven net "${target}" (${count} assigns) in "${current_module}"`, rule: 'no-multi-driven' });
        }
      }
      if (module_depth === 0) {
        diagnostics.push({ line_number, severity: 'error', message: 'endmodule without matching module', rule: 'balanced-module' });
      }
      module_depth--;
      current_module = '';
      module_assign_targets = new Map();
    }

    // Track port list close
    if (in_port_list && trimmed.includes(');')) in_port_list = false;

    // --- Port declarations ---
    if (module_depth > 0 && (trimmed.startsWith('input ') || trimmed.startsWith('output '))) {
      if (!trimmed.includes('wire')) {
        diagnostics.push({ line_number, severity: 'warning', message: 'Port missing explicit "wire" net type', rule: 'explicit-wire' });
      }
    }

    // --- Assign statements ---
    if (trimmed.startsWith('assign ')) {
      if (module_depth === 0) {
        diagnostics.push({ line_number, severity: 'error', message: 'assign outside module', rule: 'assign-in-module' });
      }
      if (!trimmed.endsWith(';')) {
        diagnostics.push({ line_number, severity: 'error', message: 'assign missing trailing semicolon', rule: 'assign-semicolon' });
      }
      if (!trimmed.includes('=')) {
        diagnostics.push({ line_number, severity: 'error', message: 'assign missing "="', rule: 'assign-equals' });
      }
      // Track target for multi-driven detection
      const target_match = trimmed.match(/^assign\s+(\w+)\s*=/);
      if (target_match) {
        const target = target_match[1];
        module_assign_targets.set(target, (module_assign_targets.get(target) || 0) + 1);
      }
    }

    // --- Wire declarations ---
    if (trimmed.startsWith('wire ') && module_depth > 0 && !in_port_list) {
      if (!trimmed.endsWith(';')) {
        diagnostics.push({ line_number, severity: 'error', message: 'wire declaration missing semicolon', rule: 'wire-semicolon' });
      }
    }

    // --- Literal format validation ---
    const bad_literals = trimmed.match(/\b\d+'[^hHbBdD\s]/g);
    if (bad_literals) {
      for (const lit of bad_literals) {
        diagnostics.push({ line_number, severity: 'warning', message: `Suspicious literal: ${lit}`, rule: 'literal-format' });
      }
    }

    // --- TypeScript leak detection ---
    const ts_keywords = ['function ', 'const ', 'let ', 'return ', 'import ', 'export '];
    for (const kw of ts_keywords) {
      if (trimmed.startsWith(kw) && !trimmed.startsWith('//')) {
        diagnostics.push({ line_number, severity: 'error', message: `TypeScript keyword "${kw.trim()}" in output`, rule: 'no-typescript' });
      }
    }

    // --- Balanced delimiters per line ---
    for (const char of trimmed) {
      if (char === '(') paren_depth++;
      if (char === ')') paren_depth--;
    }
  }

  // --- File-level checks ---
  if (!has_timescale) diagnostics.push({ line_number: 1, severity: 'warning', message: 'Missing `timescale directive', rule: 'timescale' });
  if (!has_default_nettype_none) diagnostics.push({ line_number: 1, severity: 'warning', message: 'Missing `default_nettype none', rule: 'default-nettype' });
  if (!has_default_nettype_wire) diagnostics.push({ line_number: lines.length, severity: 'warning', message: 'Missing `default_nettype wire restoration', rule: 'default-nettype' });
  if (module_depth !== 0) diagnostics.push({ line_number: lines.length, severity: 'error', message: `Unclosed module (depth=${module_depth})`, rule: 'balanced-module' });
  if (paren_depth !== 0) diagnostics.push({ line_number: lines.length, severity: 'error', message: `Unbalanced parentheses (depth=${paren_depth})`, rule: 'balanced-parens' });

  return diagnostics;
}
