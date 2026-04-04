import { StatementAST, IfAST, SwitchAST, WhileAST, ReturnAST, VarDeclAST, AssignAST, ExprStmtAST, CallStmtAST } from './class-module-ast';
import { ClassDeclParser } from './class-decl-parser';
export declare class ClassStmtParser extends ClassDeclParser {
    protected parseStatement(): StatementAST | null;
    protected parseStatements(): StatementAST[];
    protected parseIf(): IfAST;
    protected parseStatementBlockOrSingle(): StatementAST[];
    protected parseSwitch(): SwitchAST;
    protected parseWhile(): WhileAST;
    protected parseReturn(): ReturnAST;
    protected parseVarDecl(): VarDeclAST;
    protected parseAssignOrExpr(): AssignAST | ExprStmtAST | CallStmtAST;
    private tryParseAssignTarget;
}
