// Structured compiler error with source location for diagnostics.

export interface SourceLocation {
  readonly line: number;
  readonly column: number;
  readonly file_path?: string;
}

export class CompilerError extends Error {
  readonly location: SourceLocation;
  readonly error_code: string;
  readonly raw_message: string;

  constructor(message: string, location: SourceLocation, error_code: string) {
    const locPrefix = location.file_path
      ? `${location.file_path}:${location.line}:${location.column}: `
      : `(line ${location.line}, col ${location.column}) `;
    super(`${locPrefix}[${error_code}] ${message}`);
    this.location = location;
    this.error_code = error_code;
    this.raw_message = message;
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
