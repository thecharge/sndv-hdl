// ts2v runtime decorators — valid TypeScript with experimentalDecorators
//
// These are no-op markers at runtime. The ts2v transpiler reads them
// from source at the token level during compilation to SystemVerilog.
// They exist solely so that `tsc --strict` passes on user hardware code.

// ── Class decorator ───────────────────────────────────────────

/**
 * Marks a class as a synthesizable hardware module.
 * Compiles to a SystemVerilog `module ... endmodule` block.
 *
 * @example
 *   @Module
 *   class Counter extends HardwareModule { ... }
 */
export function Module<T extends new (...args: unknown[]) => object>(target: T): T {
  return target;
}

// ── Property decorators ───────────────────────────────────────

/**
 * Marks a property as an input port.
 * Compiles to `input wire logic [N-1:0] name` in the port list.
 */
export function Input(_target: object, _propertyKey: string): void {
  // no-op — parsed by ts2v compiler
}

/**
 * Marks a property as an output port.
 * Compiles to `output logic [N-1:0] name` in the port list.
 * The initial value becomes the async reset value.
 */
export function Output(_target: object, _propertyKey: string): void {
  // no-op — parsed by ts2v compiler
}

/**
 * Marks a property as a submodule instance.
 * Compiles to a SystemVerilog module instantiation.
 *
 * @example
 *   @Submodule pwm = new PwmCore();
 */
export function Submodule(_target: object, _propertyKey: string): void {
  // no-op — parsed by ts2v compiler
}

// ── Method decorators ─────────────────────────────────────────

/**
 * Marks a method as clocked sequential logic.
 * Compiles to `always_ff @(posedge <clock> or negedge rst_n)`.
 * All assignments inside become non-blocking (`<=`).
 *
 * @param clock - Name of the clock signal (must match an @Input property)
 *
 * @example
 *   @Sequential('clk')
 *   tick(): void { this.count++; }
 */
export function Sequential(_clock: string): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    return descriptor;
  };
}

/**
 * Marks a method as combinational logic.
 * Compiles to `always_comb begin ... end`.
 * All assignments inside become blocking (`=`).
 */
export function Combinational(
  _target: object,
  _propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
): PropertyDescriptor {
  return descriptor;
}

// ── Inline assertion ──────────────────────────────────────────

/**
 * Inline SVA assertion. Place inside @Sequential or @Combinational methods.
 * Compiles to `assert (<condition>);` or
 * `assert (<condition>) else $error("<message>");`
 *
 * @example
 *   Assert(this.count < 15, "counter overflow");
 */
export function Assert(_condition: boolean, _message?: string): void {
  // no-op at runtime — ts2v emits SystemVerilog assertion
}
