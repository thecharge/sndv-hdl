export interface ClassModuleAST {
    name: string;
    base_class: string | null;
    decorators: DecoratorAST[];
    config: ModuleConfig;
    enums: EnumAST[];
    properties: PropertyAST[];
    parameters: ModuleParameterAST[];
    methods: MethodAST[];
    submodules: SubmoduleAST[];
    assertions: AssertionAST[];
    helpers: Record<string, StatementAST[]>;
}
export interface DecoratorAST {
    name: string;
    args: string[];
}
export interface ModuleConfig {
    reset_signal: string;
    reset_polarity: 'active_low' | 'active_high';
    reset_type: 'async' | 'sync';
}
export interface EnumAST {
    name: string;
    members: {
        name: string;
        value?: number;
    }[];
}
export interface PropertyAST {
    name: string;
    direction: 'input' | 'output' | 'internal';
    bit_width: number;
    initial_value: string | null;
    is_array: boolean;
    array_size: number;
    is_const: boolean;
}
export interface MethodAST {
    name: string;
    type: 'sequential' | 'combinational';
    clock: string;
    is_async: boolean;
    body: MethodBodyAST;
    has_await: boolean;
}
export interface SubmoduleAST {
    instance_name: string;
    module_type: string;
    port_map: PortMapEntry[];
    param_map: ParamOverrideEntry[];
}
export interface PortMapEntry {
    port_name: string;
    wire_name: string;
}
export interface ParamOverrideEntry {
    param_name: string;
    value: string;
}
export interface AssertionAST {
    label: string | null;
    condition: string;
    clock: string;
    message: string | null;
}
export type MethodBodyAST = StatementAST[];
export type StatementAST = AssignAST | IfAST | SwitchAST | ReturnAST | VarDeclAST | ExprStmtAST | WhileAST | ForAST | AssertStmtAST | AwaitAST | CallStmtAST;
export interface AssignAST {
    kind: 'assign';
    target: string;
    value: string;
}
export interface IfAST {
    kind: 'if';
    condition: string;
    then_body: StatementAST[];
    else_body: StatementAST[] | null;
}
export interface SwitchAST {
    kind: 'switch';
    expr: string;
    cases: {
        label: string;
        body: StatementAST[];
    }[];
    default_body: StatementAST[] | null;
}
export interface ReturnAST {
    kind: 'return';
    value: string | null;
}
export interface VarDeclAST {
    kind: 'var';
    name: string;
    type: string;
    value: string;
}
export interface ExprStmtAST {
    kind: 'expr';
    text: string;
}
export interface WhileAST {
    kind: 'while';
    condition: string;
    body: StatementAST[];
}
export interface ForAST {
    kind: 'for';
    init: string;
    cond: string;
    incr: string;
    body: StatementAST[];
}
export interface AssertStmtAST {
    kind: 'assert';
    condition: string;
    message: string | null;
}
export interface AwaitAST {
    kind: 'await';
    signal: string;
}
export interface CallStmtAST {
    kind: 'call';
    method: string;
}
export interface ModuleParameterAST {
    name: string;
    bit_width: number;
    default_value: number;
}
export interface ModuleSignature {
    name: string;
    inputs: {
        name: string;
        bit_width: number;
    }[];
    outputs: {
        name: string;
        bit_width: number;
    }[];
    parameters: ModuleParameterAST[];
}
export interface TopLevelConstAST {
    name: string;
    value: string;
}
export interface ClassCompilationResult {
    success: boolean;
    systemverilog: string;
    errors: string[];
    parsed: {
        enums: EnumAST[];
        modules: ClassModuleAST[];
        consts: TopLevelConstAST[];
    } | null;
}
