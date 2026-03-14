/**
 * Marks a class as a synthesizable hardware module.
 */
export function Module<T extends new (...args: unknown[]) => object>(target: T): T {
  return target;
}

/**
 * Marks a property as an input port.
 */
export function Input(_target: object, _propertyKey: string): void {
  // Parsed by ts2v compiler.
}

/**
 * Marks a property as an output port.
 */
export function Output(_target: object, _propertyKey: string): void {
  // Parsed by ts2v compiler.
}

/**
 * Marks a property as a submodule instance.
 */
export function Submodule(_target: object, _propertyKey: string): void {
  // Parsed by ts2v compiler.
}

/**
 * Marks a method as clocked sequential logic.
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
 */
export function Assert(_condition: boolean, _message?: string): void {
  // Parsed by ts2v compiler.
}

/**
 * Overrides module-level compiler configuration (reset signal name, polarity,
 * reset type).  Accepted keys in the config string:
 *   resetSignal: "<name>"   — signal used as the hardware reset (default: rst_n)
 *   active_high             — reset is active-high (default: active_low)
 *   synchronous             — use synchronous reset (default: async)
 * Example: @ModuleConfig('resetSignal: "no_rst"')
 */
export function ModuleConfig(_config: string): ClassDecorator {
  return (_target: object) => {
    // No-op at runtime; parsed by ts2v compiler.
  };
}
