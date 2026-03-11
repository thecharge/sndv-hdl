// Compiler pipeline: orchestrates lexer -> parser -> type checker -> code generator.

import { Lexer } from '../lexer';
import { Token } from '../lexer/token';
import { Parser } from '../parser';
import { ProgramNode, AstNodeKind } from '../parser/ast';
import { TypeChecker, CheckedFunction } from '../typechecker';
import { VerilogEmitter } from '../codegen';
import { CompilerConfig, BASE_CONFIG, mergeConfig } from '../config';
import { CompilerError } from '../errors/compiler-error';

// Result of each pipeline stage for inspection and debugging.
export interface CompilationResult {
  readonly source: string;
  readonly tokens: Token[];
  readonly ast: ProgramNode;
  readonly checked_functions: CheckedFunction[];
  readonly verilog: string;
  readonly errors: CompilerError[];
  readonly success: boolean;
}

export class CompilerPipeline {
  private readonly config: CompilerConfig;

  constructor(config_overlay?: Partial<any>) {
    this.config = config_overlay ? mergeConfig(BASE_CONFIG, config_overlay) : BASE_CONFIG;
  }

  /**
   * Run the full compilation pipeline on TypeScript source code.
   * @param source - TypeScript source string.
   * @returns CompilationResult with all intermediate artifacts.
   * @example
   *   const result = new CompilerPipeline().compile('function add(a: number, b: number): number { return a + b; }');
   *   console.log(result.verilog);
   */
  compile(source: string): CompilationResult {
    const errors: CompilerError[] = [];
    let tokens: Token[] = [];
    let ast: ProgramNode = { kind: AstNodeKind.Program, body: [], location: { line: 1, column: 1 } };
    let checked_functions: CheckedFunction[] = [];
    let verilog = '';

    try {
      // Stage 1: Lexing
      tokens = new Lexer(source).tokenize();

      // Stage 2: Parsing
      ast = new Parser(tokens).parse();

      // Stage 3: Type checking
      const checker = new TypeChecker();
      checked_functions = checker.check(ast);

      // Stage 4: Code generation
      verilog = new VerilogEmitter(checked_functions).emit(ast);

    } catch (error) {
      if (error instanceof CompilerError) {
        errors.push(error);
      } else {
        throw error;
      }
    }

    return { source, tokens, ast, checked_functions, verilog, errors, success: errors.length === 0 };
  }

  /**
   * Run only the lexer stage.
   * @param source - TypeScript source string.
   * @returns Token array.
   */
  lex(source: string): Token[] {
    return new Lexer(source).tokenize();
  }

  /**
   * Run lexer and parser stages.
   * @param source - TypeScript source string.
   * @returns Parsed AST.
   */
  parse(source: string): ProgramNode {
    const tokens = this.lex(source);
    return new Parser(tokens).parse();
  }
}
