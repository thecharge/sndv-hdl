import { ClassModuleAST, EnumAST, TopLevelConstAST } from './class-module-ast';
import { ClassStmtParser } from './class-stmt-parser';
export declare class ClassModuleParser extends ClassStmtParser {
    constructor(source: string);
    parse(): {
        enums: EnumAST[];
        modules: ClassModuleAST[];
        consts: TopLevelConstAST[];
    };
    private parseTopLevelConst;
    private parseClass;
    private parseMethod;
    private bodyHasAwait;
}
