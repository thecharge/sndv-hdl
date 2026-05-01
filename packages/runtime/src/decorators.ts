/**
 * Marks a property as a synthesisable module parameter.
 *
 * At runtime this is a no-op. At compile time the property is emitted as a
 * `parameter` in the SV module header and excluded from the port list.
 * A numeric literal initialiser is required — ts2v uses it as the default value.
 *
 * SV mapping: `@Param WIDTH: Logic<8> = 8` -> `parameter logic [7:0] WIDTH = 8`
 *
 * @param _target      - The class prototype (injected by TypeScript decorator machinery).
 * @param _propertyKey - The property name (injected by TypeScript decorator machinery).
 */
export function Param(_target: object, _propertyKey: string): void {
  // Parsed by ts2v compiler.
}

/**
 * Marks a class as a synthesisable hardware module.
 *
 * Apply to any class extending `HardwareModule`. The compiler emits one SV
 * `module` declaration per decorated class. At runtime the decorator is a no-op
 * that returns the target class unchanged.
 *
 * @param target - The class constructor to mark as a hardware module.
 * @returns The same class constructor (unmodified at runtime).
 *
 * @example
 *   \@Module
 *   class Adder extends HardwareModule { ... }
 */
export function Module<T extends new (...args: unknown[]) => object>(target: T): T {
  return target;
}

/**
 * Marks a property as an input port.
 *
 * The property is emitted as `input logic [N-1:0] name` in the SV module header.
 * At runtime this is a no-op.
 *
 * @param _target      - The class prototype.
 * @param _propertyKey - The port name.
 */
export function Input(_target: object, _propertyKey: string): void {
  // Parsed by ts2v compiler.
}

/**
 * Marks a property as an output port.
 *
 * The property is emitted as `output logic [N-1:0] name` in the SV module header.
 * At runtime this is a no-op.
 *
 * @param _target      - The class prototype.
 * @param _propertyKey - The port name.
 */
export function Output(_target: object, _propertyKey: string): void {
  // Parsed by ts2v compiler.
}

/**
 * Marks a property as a submodule instance.
 *
 * The property type must be a class decorated with `@Module`. The compiler emits
 * a named-port instantiation, auto-wiring ports by name. At runtime this is a no-op.
 *
 * @param _target      - The class prototype.
 * @param _propertyKey - The submodule instance name.
 */
export function Submodule(_target: object, _propertyKey: string): void {
  // Parsed by ts2v compiler.
}

/**
 * Marks a method as clocked sequential logic.
 *
 * The method body is emitted inside `always_ff @(posedge <clock> or negedge rst_n)`
 * with all assignments converted to non-blocking (`<=`). An async active-low reset
 * block is injected unless suppressed via `@ModuleConfig`.
 *
 * @param _clock - The clock signal name (e.g. `'clk'`). Must match an `@Input` port.
 * @returns A method decorator that returns the method descriptor unchanged at runtime.
 *
 * @example
 *   \@Sequential('clk')
 *   tick() { this.counter = this.counter + 1; }
 */
export function Sequential(_clock: string): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => descriptor;
}

/**
 * Marks a method as combinational logic.
 *
 * The method body is emitted inside `always_comb` with all assignments converted
 * to blocking (`=`). All outputs and local variables assigned inside must be fully
 * covered in every branch (no latches).
 *
 * At runtime the decorator returns the method descriptor unchanged.
 *
 * @param _target      - The class prototype.
 * @param _propertyKey - The method name.
 * @param descriptor   - The method property descriptor.
 * @returns The unchanged descriptor.
 *
 * @example
 *   \@Combinational
 *   compute() { this.result = this.a + this.b; }
 */
export function Combinational(
  _target: object,
  _propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
): PropertyDescriptor {
  return descriptor;
}

/**
 * Inline assertion marker for synthesis output.
 *
 * Translates to an SVA `assert property` statement in the generated SV.
 * At runtime this is a no-op.
 *
 * @param _condition - The boolean condition that must hold.
 * @param _message   - Optional human-readable failure message (emitted as a comment).
 */
export function Assert(_condition: boolean, _message?: string): void {
  // Parsed by ts2v compiler.
}

/**
 * Auto-inferred hardware block decorator.
 *
 * Desugars to `@Sequential(clock)` when a clock argument is provided,
 * or `@Combinational` when omitted. Lets the compiler infer the block
 * type from the method body when no argument is supplied.
 *
 * @param _clock - Optional clock signal name. When present, behaves like
 *                 `@Sequential(_clock)`; when absent, behaves like `@Combinational`.
 *
 * @example
 *   \@Hardware('clk')
 *   compute() { this.out = this.a + this.b; }
 *
 *   \@Hardware
 *   decode() { this.result = this.opcode & 0xF; }
 */
export function Hardware(_clock?: string): MethodDecorator {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => descriptor;
}

/**
 * Overrides module-level compiler configuration.
 *
 * Accepted keys in the config string:
 * - `resetSignal: "<name>"` — signal used as the hardware reset (default: `rst_n`)
 * - `active_high` — reset is active-high (default: active-low)
 * - `synchronous` — use synchronous reset (default: asynchronous)
 *
 * @param _config - A configuration string parsed by the ts2v compiler at compile time.
 *                  Not evaluated as JavaScript at runtime.
 * @returns A class decorator that is a no-op at runtime.
 *
 * @example
 *   \@ModuleConfig('resetSignal: "no_rst"')
 *   \@Module
 *   class NoReset extends HardwareModule { ... }
 */
export function ModuleConfig(_config: string): ClassDecorator {
  return (_target: object) => {
    // No-op at runtime; parsed by ts2v compiler.
  };
}
