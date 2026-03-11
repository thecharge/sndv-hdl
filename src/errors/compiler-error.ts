// Structured compiler error with source location for diagnostics.

export interface SourceLocation {
  readonly line: number;
  readonly column: number;
  readonly file_path?: string;
}

export class CompilerError extends Error {
  readonly location: SourceLocation;
  readonly error_code: string;

  constructor(message: string, location: SourceLocation, error_code: string) {
    const prefix = `[${error_code}] `;
    const suffix = ` (line ${location.line}, col ${location.column})`;
    super(prefix + message + suffix);
    this.location = location;
    this.error_code = error_code;
    this.name = 'CompilerError';
  }
}

// Factory helpers for common error categories.
export function lexerError(message: string, location: SourceLocation): CompilerError {
  return new CompilerError(message, location, 'TS2V-1000');
}

export function parserError(message: string, location: SourceLocation): CompilerError {
  return new CompilerError(message, location, 'TS2V-2000');
}

export function typeError(message: string, location: SourceLocation): CompilerError {
  return new CompilerError(message, location, 'TS2V-3000');
}

export function codegenError(message: string, location: SourceLocation): CompilerError {
  return new CompilerError(message, location, 'TS2V-4000');
}
