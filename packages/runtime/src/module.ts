/**
 * Base class for all ts2v hardware modules.
 */
export abstract class HardwareModule {
  // Allows references to decorated members while preserving strict mode.
  [key: string]: unknown;
}
