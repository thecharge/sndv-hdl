import { CompilerError } from './errors/compiler-error';
export declare function buildFile(inputPath: string, outDir: string): {
    success: boolean;
    outPath: string;
    lines: number;
    compilerError?: CompilerError;
};
export declare function buildClassSource(source: string, outName: string, outDir: string): {
    success: boolean;
    outPath: string;
    lines: number;
};
/** @deprecated Use `generateBoardConstraints` from `packages/core/src/compiler/constraints/generate-board-constraints.ts` instead. */
export declare function generateConstraints(boardJsonPath: string, outDir: string): string;
