import { ProgramNode } from '../parser/ast';
import { HardwareType } from './hardware-type';
export interface CheckedFunction {
    readonly name: string;
    readonly parameters: ReadonlyArray<{
        name: string;
        hardware_type: HardwareType;
    }>;
    readonly return_type: HardwareType;
    readonly locals: ReadonlyArray<{
        name: string;
        hardware_type: HardwareType;
        is_const: boolean;
    }>;
}
export declare class TypeChecker {
    private readonly environment;
    private current_function_locals;
    private checked_functions;
    /**
     * Type-check the entire program AST.
     * @param program - The parsed ProgramNode.
     * @returns Array of checked function metadata for code generation.
     * @example
     *   const functions = new TypeChecker().check(ast);
     */
    check(program: ProgramNode): CheckedFunction[];
    private checkFunction;
    private checkBlock;
    private checkStatement;
    private resolveTypeAnnotation;
}
