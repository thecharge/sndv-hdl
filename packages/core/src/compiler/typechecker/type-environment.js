"use strict";
// Scoped symbol table for tracking variable types during type checking.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeEnvironment = void 0;
class TypeEnvironment {
    scopes = [new Map()];
    // Push a new nested scope.
    pushScope() {
        this.scopes.push(new Map());
    }
    // Pop the most recent scope.
    popScope() {
        if (this.scopes.length <= 1)
            throw new Error('Cannot pop the global scope');
        this.scopes.pop();
    }
    // Define a symbol in the current scope.
    define(entry) {
        const current_scope = this.scopes[this.scopes.length - 1];
        current_scope.set(entry.name, entry);
    }
    // Look up a symbol by walking scopes outward.
    lookup(name) {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            const entry = this.scopes[i].get(name);
            if (entry !== undefined)
                return entry;
        }
        return undefined;
    }
    // Check if a name exists in the current (innermost) scope only.
    existsInCurrentScope(name) {
        return this.scopes[this.scopes.length - 1].has(name);
    }
}
exports.TypeEnvironment = TypeEnvironment;
//# sourceMappingURL=type-environment.js.map