import { Token } from '../lexer/token';
import { ProgramNode } from './ast';
import { ExpressionParser } from './expression-parser';
export declare class Parser extends ExpressionParser {
    constructor(tokens: Token[]);
    /**
     * Parse all tokens into a ProgramNode AST root.
     * @returns The root AST node containing all function declarations.
     * @example
     *   const ast = new Parser(tokens).parse();
     */
    parse(): ProgramNode;
    private parseFunctionDeclaration;
    private parseParameterList;
    private parseParameter;
    private parseTypeAnnotation;
    private parseBlock;
    private parseStatement;
    private parseVariableDeclaration;
    private parseReturnStatement;
    private parseIfStatement;
    private parseExpressionStatement;
}
