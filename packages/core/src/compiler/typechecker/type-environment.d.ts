import { HardwareType } from './hardware-type';
export interface SymbolEntry {
    readonly name: string;
    readonly hardware_type: HardwareType;
    readonly is_const: boolean;
}
export declare class TypeEnvironment {
    private readonly scopes;
    pushScope(): void;
    popScope(): void;
    define(entry: SymbolEntry): void;
    lookup(name: string): SymbolEntry | undefined;
    existsInCurrentScope(name: string): boolean;
}
