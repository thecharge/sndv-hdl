import { Token } from '../lexer/token';
import { DecoratorAST, EnumAST, PropertyAST, SubmoduleAST } from './class-module-ast';
import { ParserBase } from './class-module-parser-base';
export declare class ClassDeclParser extends ParserBase {
    constructor(tokens: Token[]);
    protected skipImportsAndExports(): void;
    protected parseEnum(): EnumAST;
    protected parseDecorator(): DecoratorAST;
    protected parseProperty(decorator: DecoratorAST | null): PropertyAST;
    protected parseTypeSpec(): {
        width: number;
        is_array: boolean;
        array_size: number;
    };
    protected parsePositiveInteger(token: Token, field_name: string): number;
    protected parsePositiveIntegerLiteral(value: string, token: Token, field_name: string): number;
    protected parseSubmoduleDecl(dec: DecoratorAST): SubmoduleAST;
}
