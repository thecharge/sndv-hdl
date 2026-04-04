/**
 * Base class for all ts2v synthesisable hardware modules.
 *
 * Extend this class and apply the `@Module` decorator to define a hardware module.
 * Declare ports with `@Input` / `@Output`, internal registers as plain class fields,
 * and logic blocks with `@Sequential` / `@Combinational`.
 *
 * The index signature (`[key: string]: unknown`) is intentionally absent — all decorated
 * fields are strongly typed on each subclass. Dynamic property access is not a supported
 * pattern for hardware modules.
 *
 * @example
 *   \@Module
 *   class Blinker extends HardwareModule {
 *     \@Input  clk:  Bit = 0;
 *     \@Output led:  Bit = 0;
 *     counter: Logic<24> = 0;
 *
 *     \@Sequential('clk')
 *     tick() { ... }
 *   }
 */
export abstract class HardwareModule {}
