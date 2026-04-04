export * from './class-module-ast';
export { ClassModuleParser } from './class-module-parser';
export { ClassModuleEmitter } from './class-module-emitter';
import { ClassCompilationResult } from './class-module-ast';
export declare function compileClassModule(source: string): ClassCompilationResult;
