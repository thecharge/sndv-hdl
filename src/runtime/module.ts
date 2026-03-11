// ts2v runtime base class
//
// All hardware modules extend this class. It provides the base
// contract that the ts2v compiler expects: a class with decorated
// properties (inputs/outputs/internals) and decorated methods
// (sequential/combinational).
//
// At runtime this is effectively empty — it exists for type safety.

/**
 * Base class for all ts2v hardware modules.
 *
 * @example
 *   @Module
 *   class Counter extends HardwareModule {
 *     @Input  clk:   Bit   = 0;
 *     @Input  rst_n: Bit   = 0;
 *     @Output count: Logic<8> = 0;
 *
 *     @Sequential('clk')
 *     tick(): void {
 *       this.count++;
 *     }
 *   }
 */
export abstract class HardwareModule {
  // Index signature allows the compiler's translateExpr to reference
  // `this.<property>` without TS complaining about unknown members.
  // User-defined @Input/@Output properties are the real contract.
  [key: string]: unknown;
}
