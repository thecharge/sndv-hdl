// Shared TypeScript testbench spec types.
//
// ALL testbench source in this project is TypeScript.
// These types describe test intent at the logical level.
// Generators (scripts/generate-*.ts) read these specs and produce
// synthesisable SV testbenches in .artifacts/ for container simulation.
// Never write raw .sv testbench files — always start with a TypeScript spec.

// ---------------------------------------------------------------------------
// Combinational module spec
// ---------------------------------------------------------------------------

/** One test vector for a combinational (function-based) module. */
export interface CombTestVector {
    label: string;
    /** Input signal name → SystemVerilog literal (e.g. "32'd42", "1'b1"). */
    inputs: Record<string, string>;
    /** Output signal name → expected SV expression or literal. */
    expected: Record<string, string>;
}

/** Full spec for a purely combinational module. */
export interface CombTestSpec {
    kind: 'combinational';
    /** SV module name matching the TypeScript function name. */
    module: string;
    /** Path to the TypeScript source file. */
    sourceFile: string;
    ports: {
        inputs: { name: string; width: number }[];
        outputs: { name: string; width: number }[];
    };
    vectors: CombTestVector[];
}

// ---------------------------------------------------------------------------
// Sequential module spec
// ---------------------------------------------------------------------------

/** One behavioural check applied after stimulating a sequential module. */
export interface SeqCheckSpec {
    label: string;
    /**
     * Registers to force to specific values before the check.
     * Key = signal name (without module prefix), Value = SV literal.
     */
    forcedSignals: Record<string, string>;
    /**
     * Expected register/output values after the forced state settles.
     * Key = signal name, Value = SV literal or expression.
     */
    expectedSignals: Record<string, string>;
}

/** Full spec for a class-based (sequential) module. */
export interface SeqTestSpec {
    kind: 'sequential';
    /** SV module name matching the TypeScript class name. */
    module: string;
    /** Path to the TypeScript source file. */
    sourceFile: string;
    /** Clock signal name. */
    clock: string;
    /** Optional active-low reset signal name. */
    reset?: string;
    /** Clock half-period in nanoseconds (used by generated testbench). */
    clockHalfPeriodNs: number;
    checks: SeqCheckSpec[];
}

export type TbSpec = CombTestSpec | SeqTestSpec;
