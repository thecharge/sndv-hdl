# ts2v Release Notes: Aurora Wave Demo + Compiler Fixes

**Date:** 2026-03-29

---

## What's New

### aurora_wave - 8-Pixel Rainbow Wave Demo

The flagship viral demo for ts2v. A full-spectrum rainbow wave flowing continuously across
8 WS2812/WS2812B NeoPixel LEDs, all running in synthesised FPGA logic.

**What it looks like:**
All 8 pixels of the strip always show the complete rainbow simultaneously - each pixel offset
by 1/8 of the hue wheel from its neighbour. The wave slowly rotates (~10 s per revolution
at normal speed). Hold S2 to run at 8x speed for demos.

The 6 onboard LEDs show a ping-pong indicator in sync with the wave phase, giving a satisfying
visual relationship between the strip and the board itself.

**Key numbers at 27 MHz:**
| Parameter | Value |
|-----------|-------|
| Rainbow revolution (normal) | ~9.9 s |
| Rainbow revolution (fast, S2 held) | ~1.2 s |
| LED bounce cycle | ~5.0 s |
| Pixels per frame | 8 |
| Frame rate | ~1714 fps |
| WS2812 reset pulse | 370 µs (covers WS2812B and WS2812C-2020) |

**Compile and flash:**
```bash
sudo bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/aurora_wave \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/aurora_wave \
  --flash
```

**Single-LED fallback:** With no external strip, the on-board WS2812C-2020 (pin 79) shows
pixel0 cycling through all 16 hues in ~9.9 s. Still satisfying.

**Files:**
- `examples/hardware/tang_nano_20k/aurora_wave/aurora_serialiser.ts` - 8-pixel WS2812 chain serialiser
- `examples/hardware/tang_nano_20k/aurora_wave/aurora_gen.ts` - Rainbow wave colour generator
- `examples/hardware/tang_nano_20k/aurora_wave/aurora_wave.ts` - Top-level wiring module
- `testbenches/aurora_wave.tb-spec.ts` - Verification spec

---

## New Design Pattern: Multi-Pixel WS2812 Chain

`aurora_serialiser.ts` demonstrates the **8-pixel WS2812 chain pattern**, a workaround for
the LogicArray limitation. Instead of an array, it uses:

1. Eight explicit `pixel0..pixel7` input ports (`Logic<24>` each)
2. A `pixelIdx: Logic<3>` counter (0..7)
3. A `loadNextPixel()` helper that exploits **non-blocking assignment semantics**:

```typescript
// In tickBits(), called AFTER pixelIdx = pixelIdx + 1:
private loadNextPixel(): void {
    // pixelIdx is still OLD (non-blocking hasn't committed yet).
    // Selecting pixel[old+1] is exactly what we need.
    if (this.pixelIdx === 0) { this.shiftReg = this.pixel1; }
    else if (this.pixelIdx === 1) { this.shiftReg = this.pixel2; }
    // ...
    else { this.shiftReg = this.pixel7; }  // old pixelIdx === 6
}
```

This is a general pattern for any "advance and load next" operation where LogicArray
is unavailable. The non-blocking semantics make the helper read the pre-increment value,
which is the array index you actually want.

---

## Compiler Bug Fix: Clock Propagation in Pure-Wiring Modules

**Bug:** A top-level module with `@Input clk` but NO `@Sequential` method failed to
propagate `clk` to its submodule instances. The emitter only looked for a clock name
from `@Sequential` methods.

**Symptom:** Generated SV had `AuroraGen gen ( .btn(btn), .pixel0(pixel0), ... )` - clock
was entirely absent from the submodule port map. The synthesiser would have left clk
undriven in synthesis (or the tool would error).

**Fix:** `packages/core/src/compiler/class-compiler/class-module-emitter.ts`

```typescript
// Before: only found clock from sequential method
const parent_clk = parent.methods.find(m => m.type === 'sequential')?.clock;

// After: fall back to @Input port named 'clk' when no sequential method
const seq_clk = parent.methods.find(m => m.type === 'sequential')?.clock;
const input_clk = parent.properties.find(
    p => p.direction === 'input' && (p.name === 'clk' || p.name === seq_clk)
)?.name;
const parent_clk = seq_clk ?? input_clk;
```

**Test added:** `"wires clk to submodules even when parent has no @Sequential method"` in
`tests/class-compiler.test.ts`.

**Impact:** Any module that acts as a pure structural wrapper (no own logic, only submodules)
now correctly propagates the clock port. This is a common and legitimate HDL pattern.

---

## New Documentation: CLAUDE.md

`CLAUDE.md` added to the repository root. This file gives AI assistants and new contributors
the complete context needed to work in the repo without asking orientation questions:

- Supported TypeScript subset with confirmed/forbidden patterns table
- Tang Nano 20K board pin reference
- Compiler gap list with workarounds (from USB PD implementation review)
- DX guidance (10 rules for writing hardware modules correctly)
- WS2812 protocol summary
- File layout rules and testing approach

The `README.md` docs index now references `CLAUDE.md`.

---

## Compiler Gap List (from USB PD Implementation Review)

The following gaps were identified and documented. None are regressions - they were
present before this session. All have workarounds. Prioritised by impact:

| Priority | Gap | Workaround | Sites in USB PD code |
|----------|-----|-----------|---------------------|
| 1 | LogicArray indexed sequential access | Explicit pixelN registers + if/else chain | 21 |
| 2 | Cross-module combinational function calls | Duplicate as private helper | 3 table copies |
| 3 | Parameterised modules | Shared `_constants.ts` file | All 27 MHz modules |
| 4 | `@InOut` / tristate I/O | Split `cc_in` + `cc_out` ports | CC line driver |
| 5 | Bit-slice intrinsics (`Bits.slice`) | Shift-and-mask | Every PDO/RDO field |
| 6 | Multiple `@Submodule` of same class | Unverified; rename ports as workaround | CRC engine |
| - | `enum` for FSM states | **Already works** - use it freely | Recommended |
| - | `switch/case` in all methods | **Already works** - use it freely | Recommended |

Full details with code examples in `CLAUDE.md`.

---

## Test Suite

All 186 tests pass (`bun run test:root`).

The 1 new test covers the clock propagation fix. The 185 existing tests are unchanged.

---

## Social Media Caption (for demos)

> **FPGA running TypeScript.**
>
> This rainbow wave is not a microcontroller. It's pure hardware - synthesised from
> TypeScript source into IEEE 1800-2017 SystemVerilog and compiled to a Gowin FPGA bitstream
> using 100% open-source tools (Yosys + nextpnr).
>
> 8 NeoPixels. 27 million clock cycles per second. All 16 hues of the rainbow simultaneously.
> Zero CPU overhead.
>
> The source is ~200 lines of TypeScript. The compiler turns it into real logic gates.
>
> github.com/[your-repo]/sndv-hdl
