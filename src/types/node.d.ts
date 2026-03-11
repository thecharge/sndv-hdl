// Minimal Node.js type declarations for the transpiler.
// Covers what's actually used — no @types/node required.

declare var console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};

declare var process: {
  argv: string[];
  exit(code?: number): void;
  stdout: { write(data: string): boolean };
  stderr: { write(data: string): boolean };
};

declare var __dirname: string;
declare var __filename: string;
declare function require(id: string): any;
declare namespace require {
  var main: { id: string; filename: string } | undefined;
}
declare var module: { exports: any; id: string; filename: string };

declare class Buffer {
  static from(data: string, encoding?: string): Buffer;
  toString(encoding?: string): string;
}

declare module 'fs' {
  export function readFileSync(path: string, encoding?: string): string;
  export function writeFileSync(path: string, data: string, encoding?: string): void;
  export function readdirSync(path: string): string[];
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
  export function existsSync(path: string): boolean;
  export function statSync(path: string): { isDirectory(): boolean; isFile(): boolean };
  export namespace promises {
    function readFile(path: string, encoding: string): Promise<string>;
    function writeFile(path: string, data: string, encoding: string): Promise<void>;
    function mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
  }
}

declare module 'path' {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function basename(path: string, ext?: string): string;
  export function extname(path: string): string;
}

declare module 'node:test' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void): void;
  export function before(fn: () => void): void;
  export function after(fn: () => void): void;
  export function beforeEach(fn: () => void): void;
  export function afterEach(fn: () => void): void;
}

declare module 'node:assert' {
  function ok(value: unknown, message?: string): asserts value;
  function strictEqual<T>(actual: unknown, expected: T, message?: string): asserts actual is T;
  function notStrictEqual(actual: unknown, expected: unknown, message?: string): void;
  function deepStrictEqual(actual: unknown, expected: unknown, message?: string): void;
  function throws(block: () => void, error?: any, message?: string): void;
  function doesNotThrow(block: () => void, message?: string): void;
  function match(value: string, regExp: RegExp, message?: string): void;
  export = ok;
  export { ok, strictEqual, notStrictEqual, deepStrictEqual, throws, doesNotThrow, match };
}

declare module 'node:assert/strict' {
  function ok(value: unknown, message?: string): asserts value;
  function strictEqual<T>(actual: unknown, expected: T, message?: string): asserts actual is T;
  function notStrictEqual(actual: unknown, expected: unknown, message?: string): void;
  function deepStrictEqual(actual: unknown, expected: unknown, message?: string): void;
  function throws(block: () => void, error?: any, message?: string): void;
  function doesNotThrow(block: () => void, message?: string): void;
  function match(value: string, regExp: RegExp, message?: string): void;
  function equal<T>(actual: unknown, expected: T, message?: string): asserts actual is T;
  export = ok;
  export { ok, strictEqual, notStrictEqual, deepStrictEqual, throws, doesNotThrow, match, equal };
}
