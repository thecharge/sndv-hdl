import { EnumAST, ClassModuleAST, MethodAST, StatementAST, VarDeclAST } from './class-module-ast';
import { EmitterBase } from './class-emitter-base';
export declare class SequentialEmitter extends EmitterBase {
    private inlineHelpers;
    private eliminateReturns;
    private preprocessBody;
    protected emitSequential(method: MethodAST, mod: ClassModuleAST, enums: EnumAST[], pw: Map<string, number>): void;
    protected emitCombinational(method: MethodAST, mod: ClassModuleAST, enums: EnumAST[], pw: Map<string, number>): void;
    protected collectVarDecls(stmts: StatementAST[]): VarDeclAST[];
    private resolveLocalVarWidth;
    private emitStatements;
    private emitStatement;
}
