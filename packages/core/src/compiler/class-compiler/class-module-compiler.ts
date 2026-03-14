// Thin orchestration layer. Implementation split across sibling files:
//   class-module-ast.ts          - AST type definitions
//   class-module-parser-base.ts  - Token navigation base class
//   class-decl-parser.ts         - Declaration-level parser
//   class-stmt-parser.ts         - Statement-level parser
//   class-module-parser.ts       - Top-level module parser
//   class-sv-helpers.ts          - SV keyword table and pure helpers
//   class-emitter-base.ts        - Line/indent + expression translation
//   class-sequential-emitter.ts  - always_ff / always_comb emission
//   class-module-emitter.ts      - Structural module emitter

export * from './class-module-ast';
export { ClassModuleParser } from './class-module-parser';
export { ClassModuleEmitter } from './class-module-emitter';

import { ClassModuleParser } from './class-module-parser';
import { ClassModuleEmitter } from './class-module-emitter';
import { ClassCompilationResult } from './class-module-ast';

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
