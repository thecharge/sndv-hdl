// ts2v runtime types — valid TypeScript, passes tsc --strict
//
// Design: Logic<N> is a phantom-typed alias for `number`.
// The width parameter N is purely for the ts2v transpiler to extract
// during compilation. TypeScript itself treats Logic<8> as `number`.
// Width enforcement happens at transpilation time, not at TS type-check time.

/**
 * Core hardware signal type. N is the bit-width (1..64).
 * At runtime this is just a number. The width parameter is extracted
 * by the ts2v compiler during transpilation to SystemVerilog.
 *
 * @example
 *   let counter: Logic<8> = 0;
 *   let flag: Logic<1> = 0;
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Logic<_N extends number = 32> = number;

/** Single-bit signal. Alias for Logic<1>. */
export type Bit = Logic<1>;

// ── Convenience width aliases ─────────────────────────────────
export type Uint1 = Logic<1>;
export type Uint2 = Logic<2>;
export type Uint4 = Logic<4>;
export type Uint8 = Logic<8>;
export type Uint16 = Logic<16>;
export type Uint32 = Logic<32>;
export type Uint64 = Logic<64>;

// ── Array types for memory modeling ───────────────────────────
/**
 * Fixed-size hardware array. Maps to `logic [W-1:0] name [0:SIZE-1]` in SV.
 */
export type LogicArray<_W extends number = 8, _SIZE extends number = 0> = number[];
