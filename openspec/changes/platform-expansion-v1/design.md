## Context

ts2v today is a single-clock TypeScript-to-SystemVerilog compiler. Every `@Sequential` block implicitly belongs to one clock and one reset. Real designs (USB + system logic, HDMI pixel clock + system clock, sensor bus + MCU clock) require multiple asynchronous clock domains with safe crossings. The stdlib gap means users re-implement protocol stacks for every project. The ergonomics gap means hardware description feels ceremonial rather than expressive to TypeScript developers.

This design covers three orthogonal additions wired together: (1) a multiclock compiler extension, (2) the `@ts2v/stdlib` protocol library package, and (3) the ergonomics helper layer. Tests and documentation are delivery gates, not standalone systems.

## Goals / Non-Goals

**Goals:**
- Extend the compiler AST and codegen to support named clock domains and CDC synchronisers.
- Ship a `@ts2v/stdlib` package with synthesisable modules for the listed protocols.
- Add `SignalBus`, `Reg`, `Edge`, `rising`/`falling`, and `@Hardware` to the runtime package.
- Expand examples and testbench coverage to demonstrate and verify every new capability.
- Pass all existing and new delivery gates.

**Non-Goals:**
- High-speed USB (HS/SS), HDMI audio, partial reconfiguration.
- Formal verification or model checking integration.
- Support for boards without a verified OSS toolchain path.
- Structural changes to the CLI command interface beyond `--clock-constraints` flag.

## Decisions

### Decision 1: Clock domain as a first-class decorator

**Choice**: `@ClockDomain('name', { freq: number })` decorates a class; all `@Sequential` blocks inside inherit that domain.

**Rationale**: Matches the existing decorator-per-class pattern. The compiler already processes class decorators first. Annotating the class rather than individual signals reduces repetition and mirrors synthesiser constraint syntax (clock groups map 1:1 to named domains).

**Alternatives considered**:
- Signal-level domain annotation: more granular but dramatically more complex for users and for the crossing-detection pass.
- Implicit domain inference from port connections: unsound without global analysis; rejected.

### Decision 2: CDC synchroniser as a stdlib primitive, not compiler magic

**Choice**: `ClockDomainCrossing<T>` is a generic runtime class in `@ts2v/stdlib/cdc`, not a built-in compiler keyword. The compiler recognises it by import path and emits the appropriate two-FF or async-FIFO SV.

**Rationale**: Keeps the compiler's keyword surface minimal. Users who need custom CDC strategies can subclass. The compiler validates that every cross-domain signal flows through a recognised CDC primitive and emits a warning otherwise.

**Alternatives considered**:
- New `@CrossClock` decorator on ports: less composable, harder to type-check.

### Decision 3: `@ts2v/stdlib` as a separate monorepo package

**Choice**: New `packages/stdlib/` with its own `package.json` and Turborepo entry; each protocol in a subdirectory (`packages/stdlib/src/i2c/`, `packages/stdlib/src/spi/`, etc.).

**Rationale**: Clean dependency boundary - core compiler does not depend on stdlib. Examples and testbenches import from `@ts2v/stdlib`. The package is compiled by the same Bun + tsc pipeline as core.

**Alternatives considered**:
- Inlining stdlib into packages/runtime: conflates no-op type stubs with synthesisable logic; rejected.

### Decision 4: Ergonomics helpers are additive, not replacements

**Choice**: `SignalBus`, `Reg`, `Edge`, `rising`, `falling`, and `@Hardware` are new exports from `@ts2v/runtime`. Existing `@Sequential`, `@Combinational`, `@Module` decorators remain unchanged.

**Rationale**: Zero breaking changes. `@Hardware` desugars to `@Sequential` + `@Combinational` at the decorator level; the compiler treats them identically after the expansion pass.

**Alternatives considered**:
- Replacing decorators with a fluent builder API: would break all existing examples; rejected.

### Decision 5: Two-FF synchroniser as default CDC for single-bit signals

**Choice**: `ClockDomainCrossing<Logic>` emits a two-FF chain (IEEE 1800-2017 compliant `always_ff`). Multi-bit crossings require explicit `AsyncFifo<T, Depth>`.

**Rationale**: Two-FF is the industry standard for single-bit crossings and is fully supported by Yosys timing analysis. FIFO is the correct primitive for multi-bit data; requiring explicit use prevents accidental gray-code bugs.

### Decision 6: Formal verification via SVA emission + SymbiYosys

**Choice**: `@Assert(expr)` and `@Assume(expr)` decorators emit SystemVerilog Assertion (`assert property` / `assume property`) blocks inside `always_comb` regions. A new `bun run verify` script invokes SymbiYosys (an OSS formal tool built on top of Yosys) to run bounded model checking on the generated SV.

**Rationale**: SVA is IEEE 1800-2017 native - no new SV dialect needed. SymbiYosys is fully open-source and integrates directly with Yosys (already in the toolchain image). Bounded model checking (depth 20-50 cycles) is sufficient to catch most single-module property violations and is fast enough for CI. Properties are expressed in TypeScript (same language as the design), keeping the workflow uniform.

**Alternatives considered**:
- Unbounded model checking (IC3/PDR): more powerful but much slower; deferred to a future release.
- Inline SV `assert` statements without a model checker: catches simulation violations only, not a formal proof; insufficient.

**SymbiYosys integration**: a `.sby` configuration file is auto-generated alongside the SV output when the design contains `@Assert` / `@Assume` decorators. The `bun run verify` script runs SymbiYosys in the existing toolchain container.

### Decision 7: nibble4 CPU promoted to first-class example

**Choice**: Move `cpu/ts/nibble4_core.ts`, `nibble4_soc.ts`, `nibble4_dual_soc.ts` to `examples/cpu/nibble4/` (directory-based compile); keep `cpu/` for documentation and assembly programs only.

**Rationale**: The nibble4 source is already TypeScript targeting `@ts2v/runtime`. Moving it into `examples/cpu/nibble4/` aligns with the AGENTS.md layout rule (CPU and SoC sources under `examples/cpu/`) and allows `bun run compile:example` to cover it. The existing `cpu/rtl/*.v` hand-written SV files serve as a reference for verifying compiler output correctness.

**Alternatives considered**:
- Keeping it in `cpu/ts/`: violates AGENTS.md layout rule; not covered by the standard compile pipeline.

Decorators: `@Module`, `@Sequential`, `@Combinational`, `@ClockDomain`, `@Hardware`, `@Assert`, `@Assume`
Types: `Logic`, `LogicArray<N>`, `Input`, `Output`, `Reg<T>`, `SignalBus<T>`, `Edge`
Functions: `rising(clk)`, `falling(clk)`, `posedge(clk)` (alias)
CDC primitives: `ClockDomainCrossing<Logic>`, `AsyncFifo<T, Depth>`
All TypeScript restrictions apply: no ternary, no module-level let/var, named constants for all numeric literals.

## Generated SV Sketch

### Multi-clock module

```systemverilog
// @ClockDomain('sys', { freq: 27_000_000 })
// @ClockDomain('usb', { freq: 48_000_000 })
module DualClockTop (
  input logic sys_clk,
  input logic usb_clk,
  input logic rst_n,
  ...
);
  // Two-FF CDC for single-bit 'usb_ready' crossing usb -> sys domain
  logic usb_ready_meta;
  logic usb_ready_sync;
  always_ff @(posedge sys_clk or negedge rst_n) begin
    if (!rst_n) begin
      usb_ready_meta <= 1'b0;
      usb_ready_sync <= 1'b0;
    end else begin
      usb_ready_meta <= usb_ready_raw;
      usb_ready_sync <= usb_ready_meta;
    end
  end
endmodule
```

IEEE 1800-2017 sections relied upon: Section 9.4.2 (always_ff), Section 6.19 (logic type), Section 23 (modules and hierarchy).

## Risks / Trade-offs

- **Formal verification false-negative risk**: SymbiYosys bounded model checking (depth 20-50) cannot prove properties for all reachable states; deep pipelines may need higher depth. Mitigation: document the depth limit clearly; provide a `--depth` override in `bun run verify`.
- **nibble4 TypeScript compilation coverage**: the existing `cpu/ts/` source predates some compiler fixes; it may have patterns that need adjustment for directory-based compilation. Mitigation: treat the nibble4 migration as a compiler validation exercise - any failures reveal real compiler gaps to fix.
- **CDC false-negative risk**: The compiler can only detect CDC violations it can see at compile time. Crossings through shared memory or indirect wiring are undetectable. Mitigation: emit a lint warning whenever a signal changes domain without a recognised CDC primitive; document the limitation.
- **stdlib synthesis verification**: Each protocol module must be verified on real hardware. Mitigation: delivery gate requires at least one flash-logged example per protocol before the change is archived.
- **Ergonomics API churn**: Adding helpers now locks the API surface. Mitigation: mark all new helpers `@experimental` in JSDoc until real-board validation; document as preview.
- **FIFO depth parameter**: Static depth at compile time is a limitation; dynamic resizing is not supported. Mitigation: document clearly; this is consistent with FPGA RAM block instantiation constraints.
- **nextpnr constraint output format**: `set_clock_groups` / `set_false_path` format must match nextpnr-himbaechel's accepted SDC syntax. Mitigation: test constraint output against a real nextpnr synthesis run before delivery.

## Migration Plan

1. All changes are additive; no existing user code breaks.
2. `@ClockDomain` and `ClockDomainCrossing` are new imports - no migration needed for single-clock designs.
3. Ergonomics helpers are optional; existing decorator usage continues to work.
4. `bun run quality` extended with coverage threshold; existing tests must still pass.

## Open Questions

- Should `AsyncFifo` depth be expressed as a number of entries or as log2(depth)? Decision deferred to implementation phase - prefer entries (more intuitive).
- HDMI TMDS serialiser requires a 5x clock. Should this be a built-in `@ClockDomain` frequency multiplier hint or a user-defined domain? Prefer user-defined with a `note` in docs for this release.
- Coverage threshold percentage for CI gate - suggest 80% line coverage as initial target; QA Agent to confirm.
