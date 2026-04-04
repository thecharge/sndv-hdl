import { EnumAST, ClassModuleAST } from './class-module-ast';
export declare class EmitterBase {
    protected lines: string[];
    protected indent: number;
    protected global_consts: Map<string, string>;
    protected line(text: string): void;
    protected sizeLiteral(expr: string, width: number): string;
    protected translateExpr(expr: string, enums: EnumAST[], mod: ClassModuleAST): string;
}
