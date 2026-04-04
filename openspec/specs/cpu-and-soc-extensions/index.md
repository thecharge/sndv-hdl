# cpu-and-soc-extensions

**Owner:** Compiler Agent + Toolchain Agent
**Status:** Experimental / In Progress
**Version:** Bootstrap 1.0

## Summary

The CPU and SoC extensions capability covers the design and implementation of complex
multi-module digital systems — specifically the Nibble4 CPU and associated SoC constructs
developed under `examples/cpu/` and `cpu/`.

These designs push the boundaries of the supported TypeScript subset and exercise:
- Multi-module composition via `@Submodule`
- Complex FSM state machines with many states
- Multi-file directory compilation
- Register file patterns (workaround for LogicArray limitation)

The CPU and SoC sources live under `examples/cpu/` and MUST import from `'@ts2v/runtime'`
(not the legacy `'ts2sv'` alias).

## Files

- `requirements.md` - Requirements for CPU/SoC designs
- `constraints.md` - Constraints and known limitations affecting complex designs

## Key Source Locations

| Path | Responsibility |
|---|---|
| `examples/cpu/` | TypeScript CPU and SoC source files |
| `cpu/README_ASSEMBLY.md` | Nibble4 CPU architecture and assembly guide |

## Key Known Limitations Affecting This Capability

| Limitation | Impact on CPU/SoC | Workaround |
|---|---|---|
| No LogicArray indexed sequential access | Cannot write `registers[idx]` in always_ff | Explicit reg0..regN + if/else chain |
| No parameterised modules | Cannot use `class CPU<WORD_WIDTH>` | Shared `_constants.ts` |
| No `@InOut` | USB PD CC lines require bidirectional I/O | Split input/output + external mux |
| No multi-clock CDC | Cannot formally annotate clock crossings | Manual synchronisers, documented crossings |
| Enum global namespace | CPU FSMs with many states must use unique names | Prefix all enum members by FSM name |

## Related Capabilities

- `ts-to-sv-compiler-core` - CPU designs are the most demanding test of the compiler
- `hardware-decorators-and-runtime` - all CPU modules use the full decorator set
- `uvm-style-verification` - CPU modules benefit from behavioral testbenches
- `example-hardware-designs` - CPU examples are hardware examples at higher complexity
