export interface SourceLocation {
    readonly line: number;
    readonly column: number;
    readonly file_path?: string;
}
export declare class CompilerError extends Error {
    readonly location: SourceLocation;
    readonly error_code: string;
    constructor(message: string, location: SourceLocation, error_code: string);
}
export declare function lexerError(message: string, location: SourceLocation): CompilerError;
export declare function parserError(message: string, location: SourceLocation): CompilerError;
export declare function typeError(message: string, location: SourceLocation): CompilerError;
export declare function codegenError(message: string, location: SourceLocation): CompilerError;
