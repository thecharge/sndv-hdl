# Production Readiness

This document defines what "production-ready" means for this repository.

## Definition
Production-ready means:
- compiler and toolchain pass quality gates,
- board programming flow is reproducible,
- behavior is validated on real hardware,
- runbooks exist for common failure modes.

## Readiness Gates
1. `bun run quality` passes.
2. compile command generates all expected artifacts.
3. flash command uses persistent external write + verify.
4. power-cycle behavior is confirmed for validated examples.
5. docs/runbooks are up to date and operational.

## Compiler Policy
- No hard cap on source line count.
- No hard cap on bit width (`Logic<N>`, `UintN`, `UIntN` use positive integer widths).
- No hard cap on explicit array size (positive integer required).
- Real upper bounds are tool capacity, timing closure, and target silicon resources.

## Toolchain Policy
- Required pipeline: Yosys -> nextpnr-himbaechel -> gowin_pack -> openFPGALoader.
- Programming mode for Tang Nano 20K must be explicit external flash write + verify.

## Hardware Validation Policy
- Do not claim production if only simulation passed.
- Do not claim persistence if power-cycle was not tested.
- Keep append-only command evidence in `docs/append-only-engineering-log.md`.

## Required Operations Documentation
- quickstart from zero,
- board definition authoring,
- programming runbook,
- troubleshooting runbook,
- external resource links.

---

## WS2812 Production Analysis

### Status

**On-board LED (WS2812C-2020, Tang Nano 20K pin 79):** Confirmed flashed and validated on real hardware.

**External WS2812B strips:** Not yet validated on real hardware. Compiler output is believed correct; see disclaimers below.

### Protocol Verification

The `ws2812_serialiser.ts` generates the following timing at 27 MHz (37.04 ns/clock):

| Parameter | Clocks             | Duration   | WS2812B spec    | WS2812C-2020 spec | Status                                                           |
| --------- | ------------------ | ---------- | --------------- | ----------------- | ---------------------------------------------------------------- |
| T0H       | 9                  | 333 ns     | 200-500 ns      | 220-380 ns        | PASS                                                             |
| T1H       | 10-19 (when bit=1) | 370-703 ns | 580-1000 ns     | 580-1000 ns       | MARGINAL - T1H=333ns when bit=0 is intentional for T0H, see note |
| T_BIT     | 30                 | 1111 ns    | 1250 ns ±600 ns | 1250 ns ±600 ns   | PASS                                                             |
| T_RESET   | 10000              | 370 µs     | >50 µs          | >280 µs           | PASS (both variants)                                             |

> **Note on T1H**: The serialiser drives high for clocks 0-8 unconditionally (T0H pulse = 9 clocks = 333 ns). For bit=1, it continues driving high through clocks 9-18 (extending to 703 ns total). For bit=0 the line drops at clock 9. This means T0H = 333 ns and T1H = 703 ns. Both within spec for WS2812B and WS2812C-2020. The line goes low for the remainder of the 30-clock bit window.

### Root Cause History

Three protocol bugs were identified and fixed:

1. **Insufficient T_RESET (critical - WS2812C-2020 only)**: Original design used 1600 clocks (59 µs). WS2812C-2020 requires >280 µs. Fixed: 10 000 clocks = 370 µs.
2. **Off-by-one in bit count**: `if (bitIndex >= 24)` checked the pre-increment value, sending 25 bits per frame. Fixed: `bitCnt === 23` (exact equality on 0-based counter).
3. **Stale bit register**: `const bitValue = (this.shiftReg >> 23) & 1` was synthesized as a flip-flop (registered one clock late). Fixed: inline expression `((this.shiftReg >> 23) & 1) === 1` in the conditional.

### Compiler Capability Analysis

Two compiler features were added in support of this hardware design:

#### Helper Method Inlining
- **Feature**: `@Sequential` and `@Combinational` methods can call private helper methods; the helpers are inlined into the generated `always_ff` / `always_comb` block.
- **Pattern**: `this.clearState()`, `this.tickResetPhase()`, `this.tickBitsPhase()` in `tick()`.
- **Generated SV**: Inlined directly - no function call overhead, no additional always blocks.
- **Limitation**: Helpers must have no arguments and no return value beyond `void`. Recursive helpers are not supported.

#### Early Return Elimination
- **Feature**: `return` statements inside `@Sequential`/`@Combinational` methods are supported via guard pattern transformation: an `if` whose then-body ends with `return` has the remaining statements moved to an `else` clause.
- **Pattern**: `if (this.enable === 0) { this.clearState(); return; }` compiles to `if (enable == 0) begin ... end else begin ... end`.
- **Limitation**: `return` inside a loop or nested condition beyond one level is not yet supported. A `return` deeper than one `if` nesting level will be emitted as a comment.

### Known Limitations and Disclaimers

> **DISCLAIMER**: The 3.3 V GPIO output of the Tang Nano 20K FPGA may not meet the WS2812B data high voltage threshold when connecting to external 5 V LED strips. A 74AHCT125 buffer/level-shifter on the data line is recommended for external strips. The on-board WS2812C-2020 is designed to accept 3.3 V signals and works without level shifting.

> **DISCLAIMER**: The `confirmed flashed` status for `ws2812_demo` applies only to the on-board WS2812C-2020. External strips have not been tested.

> **DISCLAIMER**: `bun run quality` exercises the compiler and toolchain adapter code but does not synthesize or place-and-route. Timing closure on the target FPGA is not verified by automated tests. The design is simple enough that timing closure is expected to be trivial, but it has not been formally verified.

> **DISCLAIMER**: The WS2812 protocol does not include any acknowledgement mechanism. There is no way at the FPGA level to confirm that an LED received a valid frame. Correct operation can only be confirmed visually or with an oscilloscope.

### Test Coverage (as of this analysis)

| Area                         | Test Count | Notes                                                            |
| ---------------------------- | ---------- | ---------------------------------------------------------------- |
| Compiler (class-compiler)    | 50+        | Includes 4 new tests for helper inlining and early return        |
| Codegen                      | 30+        | Golden output checks                                             |
| WS2812 behavior (facades)    | 1 file     | Structural checks on generated SV signal names and expressions   |
| Hardware examples            | 1 file     | Behavior assertions: shiftReg, bitCnt, timer, protocol constants |
| Integration / build pipeline | 20+        | End-to-end artifact generation                                   |
| Total                        | 339        | All pass as of last run                                          |

> **Gap**: No timing-accurate simulation testbench for the WS2812 serialiser exists yet. A UVM-style testbench that drives a WS2812 BFM and checks decoded RGB values would close this gap. See `docs/guides/uvm-suite-authoring.md` for how to add one.

### Production Verdict

| Component                         | Status                | Confidence                          |
| --------------------------------- | --------------------- | ----------------------------------- |
| Compiler (helpers + early return) | Production            | High - 339 tests pass               |
| `ws2812_serialiser.ts` timing     | Production            | High - protocol-correct by analysis |
| On-board LED (WS2812C-2020)       | Confirmed on hardware | Highest - flashed and observed      |
| External WS2812B strips           | Not yet validated     | Low - use level shifter, retest     |
| Arty A7 flow                      | Constraint-gen only   | N/A - no OSS synthesis path yet     |

