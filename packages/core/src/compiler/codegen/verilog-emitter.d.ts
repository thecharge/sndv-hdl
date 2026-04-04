import { ProgramNode } from '../parser/ast';
import { CheckedFunction } from '../typechecker/typechecker';
export declare class VerilogEmitter {
    private output;
    private indent_level;
    private readonly checked_functions;
    constructor(checked_functions: CheckedFunction[]);
    /**
     * Generate Verilog source for the entire program.
     * @param program - The parsed ProgramNode AST.
     * @returns Complete Verilog source as a string.
     * @example
     *   const verilog = new VerilogEmitter(checkedFunctions).emit(ast);
     */
    emit(program: ProgramNode): string;
    private emitFunction;
    private emitPorts;
    private emitLocalDeclarations;
    private emitStatement;
    private emitIfAssignments;
    private extractAssignments;
    private extractAssignmentsFromAlternate;
    private formatBitWidth;
    private emitLine;
}
