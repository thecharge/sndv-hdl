// Scoped symbol table for tracking variable types during type checking.

import { HardwareType } from './hardware-type';

export interface SymbolEntry {
  readonly name: string;
  readonly hardware_type: HardwareType;
  readonly is_const: boolean;
}

export class TypeEnvironment {
  private readonly scopes: Map<string, SymbolEntry>[] = [new Map()];

  // Push a new nested scope.
  pushScope(): void {
    this.scopes.push(new Map());
  }

  // Pop the most recent scope.
  popScope(): void {
    if (this.scopes.length <= 1) throw new Error('Cannot pop the global scope');
    this.scopes.pop();
  }

  // Define a symbol in the current scope.
  define(entry: SymbolEntry): void {
    const current_scope = this.scopes[this.scopes.length - 1];
    current_scope.set(entry.name, entry);
  }

  // Look up a symbol by walking scopes outward.
  lookup(name: string): SymbolEntry | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const entry = this.scopes[i].get(name);
      if (entry !== undefined) return entry;
    }
    return undefined;
  }

  // Check if a name exists in the current (innermost) scope only.
  existsInCurrentScope(name: string): boolean {
    return this.scopes[this.scopes.length - 1].has(name);
  }
}
