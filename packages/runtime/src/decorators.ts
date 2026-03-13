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
