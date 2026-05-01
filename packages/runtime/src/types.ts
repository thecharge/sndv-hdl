/**
 * A hardware signal of exactly N bits.
 *
 * At the TypeScript level this is `number & { __bits?: N }` — a branded number
 * that is still fully assignable from plain `number` and supports all arithmetic
 * operators. The brand makes the bit-width visible in editor hover and catches
 * obvious width mismatches at the type level.
 *
 * @template N - Bit width (positive integer). Defaults to 32.
 *
 * @example
 *   \@Input  clk:    Bit;       // 1-bit input
 *   \@Output data:   Logic<8>;  // 8-bit output (emits: output logic [7:0] data)
 *   \@Output addr:   Logic<16>; // 16-bit output
 */
export type Logic<N extends number = 32> = number & { __bits?: N };

/**
 * A single hardware bit — equivalent to `Logic<1>`.
 *
 * @example
 *   \@Input  rst_n: Bit; // active-low reset (emits: input logic rst_n)
 */
export type Bit = Logic<1>;

/**
 * Unsigned N-bit logic signal (lowercase alias for `Logic<N>`).
 *
 * @template N - Bit width. Defaults to 32.
 *
 * @example
 *   \@Output result: Uint<8>; // emits: output logic [7:0] result
 */
export type Uint<N extends number = 32> = Logic<N>;

/**
 * Unsigned N-bit logic signal (uppercase alias for `Logic<N>`).
 *
 * @template N - Bit width. Defaults to 32.
 */
export type UInt<N extends number = 32> = Logic<N>;

/** 1-bit unsigned logic (alias for `Logic<1>`). */
export type Uint1 = Logic<1>;

/** 2-bit unsigned logic (alias for `Logic<2>`). */
export type Uint2 = Logic<2>;

/** 4-bit unsigned logic (alias for `Logic<4>`). Useful for nibbles. */
export type Uint4 = Logic<4>;

/** 8-bit unsigned logic (alias for `Logic<8>`). Maps to `logic [7:0]`. */
export type Uint8 = Logic<8>;

/** 16-bit unsigned logic (alias for `Logic<16>`). Maps to `logic [15:0]`. */
export type Uint16 = Logic<16>;

/** 32-bit unsigned logic (alias for `Logic<32>`). Maps to `logic [31:0]`. */
export type Uint32 = Logic<32>;

/** 64-bit unsigned logic (alias for `Logic<64>`). Maps to `logic [63:0]`. */
export type Uint64 = Logic<64>;

/**
 * A fixed-size register file of W-bit elements.
 *
 * Both generics are required. SIZE must be a positive integer literal — the
 * compiler needs a statically known array bound to emit `logic [W-1:0] name [0:SIZE-1]`.
 * Using `SIZE = 0` or omitting SIZE will cause a compile-time error
 * (`ERROR_ARRAY_SIZE_REQUIRED`).
 *
 * This is a branded `number[]` type: `number[] & { __bitWidth?: W; __size?: SIZE }`.
 * The brands make the width and size visible in editor hover.
 *
 * @template W    - Bit width of each element (positive integer, e.g. 1 for bits, 8 for bytes).
 * @template SIZE - Number of elements (positive integer, e.g. 8 for an 8-element array).
 *
 * @example
 *   shift_reg: LogicArray<1, 8>;  // logic [0:0] shift_reg [0:7];
 *   ram:       LogicArray<8, 16>; // logic [7:0] ram [0:15];
 */
export type LogicArray<W extends number = 8, SIZE extends number = 0> = number[] & {
  __bitWidth?: W;
  __size?: SIZE;
};

/**
 * A named group of related signals exposed as a single bundle.
 *
 * At the TypeScript level this is a structural alias — the compiler expands
 * each field to a separate port in the generated SV. This allows grouping
 * logically related signals (e.g. a bus with addr, data, and valid) without
 * requiring manual repetition in port declarations.
 *
 * @template T - An object type mapping signal names to `Logic<N>` or `Bit` types.
 *
 * @example
 *   type AxiBus = SignalBus<{ addr: Logic<32>; data: Logic<32>; valid: Bit }>;
 */
export type SignalBus<T extends Record<string, Logic<number>>> = T;

/**
 * A registered (flip-flop backed) signal.
 *
 * Type alias equivalent to `Logic<N>` — serves as documentation to indicate
 * intent: this variable is a D flip-flop register, not combinational logic.
 *
 * @template T - Signal type, typically `Logic<N>` or `Bit`.
 *
 * @example
 *   private counter: Reg<Logic<8>> = 0;  // equivalent to Logic<8> with explicit register intent
 */
export type Reg<T> = T;

/**
 * A one-cycle wide edge pulse.
 *
 * Returned by `rising()` and `falling()`; equivalent to `Bit` (1-bit logic).
 * When used in a `@Sequential` method condition, the compiler generates a
 * shadow register `prev_X` and emits:
 *   - `rising(X)`: `(X && !prev_X)`
 *   - `falling(X)`: `(!X && prev_X)`
 */
export type Edge = Bit;

/**
 * Returns 1 for one clock cycle after the signal transitions 0->1.
 *
 * Runtime no-op; translated by the compiler to an edge-detect expression.
 * Must be used inside a `@Sequential` method.
 *
 * @param _signal - The signal to detect a rising edge on.
 *
 * @example
 *   if (rising(this.btn)) { this.counter = this.counter + 1; }
 */
export function rising(_signal: Logic<1>): Edge {
  return 0;
}

/**
 * Returns 1 for one clock cycle after the signal transitions 1->0.
 *
 * Runtime no-op; translated by the compiler to an edge-detect expression.
 * Must be used inside a `@Sequential` method.
 *
 * @param _signal - The signal to detect a falling edge on.
 *
 * @example
 *   if (falling(this.btn)) { this.counter = this.counter + 1; }
 */
export function falling(_signal: Logic<1>): Edge {
  return 0;
}

/**
 * Compiler intrinsic bit-manipulation helpers.
 *
 * These functions are runtime no-ops; the class compiler translates them into
 * SystemVerilog part-select and bit-select expressions. `Bits` is a reserved
 * compiler namespace — do not declare class properties or local variables named `Bits`.
 *
 * @example
 *   const low8 = Bits.slice(this.bus, 7, 0);  // -> bus[7:0]
 *   const bit3 = Bits.bit(this.reg, 3);        // -> reg[3]
 */
export namespace Bits {
  /**
   * Part-select: extracts bits [msb:lsb] from signal.
   *
   * Translates to `signal[msb:lsb]` in SystemVerilog.
   * When both bounds are numeric literals, the typechecker infers the result
   * width as `Logic<msb - lsb + 1>`.
   *
   * @param _signal - The source signal.
   * @param _msb    - Most-significant bit index (inclusive).
   * @param _lsb    - Least-significant bit index (inclusive).
   */
  export function slice(_signal: number, _msb: number, _lsb: number): number {
    return 0;
  }

  /**
   * Bit-select: extracts bit i from signal.
   *
   * Translates to `signal[i]` in SystemVerilog.
   *
   * @param _signal - The source signal.
   * @param _i      - Bit index.
   */
  export function bit(_signal: number, _i: number): number {
    return 0;
  }
}
