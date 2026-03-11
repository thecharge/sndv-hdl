# Style Guide

## Naming
- Use explicit names that include domain context.
- Avoid abbreviations unless standard in FPGA/toolchain terminology.

## File Structure
- Keep files below 285 lines for new code.
- Split responsibilities by package and pattern.

## Required Patterns
- Adapter pattern: toolchain and compiler backends.
- Command pattern: compile/synthesize/flash operations.
- Factory pattern: adapter and command construction.
- Facade pattern: package entry APIs.
- Repository pattern: filesystem/config/runtime detection boundaries.

## Code Quality
- Lint with Biome.
- Typecheck with TypeScript strict mode baseline.
- Prefer immutable interfaces and readonly fields.
