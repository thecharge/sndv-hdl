# WS2812 Debug Guide

This guide covers the full development and debugging lifecycle for WS2812 NeoPixel drivers
compiled from TypeScript with ts2v onto the Tang Nano 20K.

---

## Protocol Fundamentals

### Wire Encoding

WS2812 uses a single-wire, return-to-zero (RZ) protocol with bit values encoded as pulse-width:

```
Bit '0':  HIGH for T0H, then LOW for T0L
Bit '1':  HIGH for T1H, then LOW for T1L
Reset:    LOW continuously for T_RESET
```

Frame format: 24 bits per LED, **MSB first**, byte order **GRB** (not RGB):

```
Bit [23:16] = Green
Bit [15:8]  = Red
Bit [7:0]   = Blue
```

After sending all LED data, the line must go LOW for at least T_RESET. The LEDs latch the
received data and display it only when they detect this reset pulse.

### Chip Variants and Their Timing Requirements at 27 MHz

The Tang Nano 20K has an on-board **WS2812C-2020** at pin 79, which has stricter timing
than the more common WS2812B used on external strips.

| Parameter | WS2812B     | WS2812C-2020 | ts2v value | Clocks at 27 MHz |
| --------- | ----------- | ------------ | ---------- | ---------------- |
| T0H       | 400 ±150 ns | 300 ±80 ns   | 333 ns     | 9 clocks         |
| T1H       | 800 ±150 ns | 790 ±210 ns  | 703 ns     | 19 clocks        |
| T_BIT     | ~1250 ns    | ~1000 ns     | 1111 ns    | 30 clocks        |
| T_RESET   | >50 µs      | **>280 µs**  | 370 µs     | 10000 clocks     |

> **Critical**: WS2812C-2020 requires T_RESET > 280 µs. Using the common 50 µs value is
> the most frequent cause of **"nothing happens"** on the Tang Nano 20K on-board LED.

---

## Known Root Causes of "Nothing Happens"

### 1. Reset pulse too short (most common)

The on-board WS2812C-2020 requires >280 µs LOW after the data. A 50 µs / 1600-clock reset
(sufficient for WS2812B) is silently ignored.

**Fix**: Use `TRESET_LAST = 9999` (10000 clocks = 370 µs).

### 2. Sending more bits than expected (off-by-one in bit counter)

If the comparison for "end of frame" uses `>=` against the post-increment value of bitIndex,
one extra bit is transmitted. For a single LED this means the LED receives 25 bit pulses;
the 25th pulse is passed through to the DO pin and the latch timing is shifted.

**Fix**: Use equality (`bitCnt === BITS_LAST`) where `BITS_LAST = 23` (24 bits total, 0..23)
instead of `bitIndex >= BITS_PER_FRAME`.

### 3. Wrong bit period (fencepost in >= timer comparison)

Using `timer >= TBIT_CLOCKS` to roll the timer gives **TBIT_CLOCKS + 1** clock period
because the timer can reach `TBIT_CLOCKS` before the roll fires.

**Fix**: Use `timer === TBIT_LAST` where `TBIT_LAST = PERIOD - 1`.

### 4. Stale bit-value register (one clock late T1H decision)

If the current bit value is computed into a local `const` variable, the compiler stores it  
in a flip-flop (non-blocking assignment). The comparison `tickInBit < T1H && bitValue == 1`
then uses the **previous** clock's bit value, not the current bit's value.

**Fix**: Inline the bit extraction directly in the condition:
```typescript
} else if (this.timer < T1H_CLOCKS && ((this.shiftReg >> 23) & 1) === 1) {
```
Or use a shift-register architecture (shift out MSB-first), where `shiftReg[23]` is
combinationally read and does not require a staging register.

### 5. 3.3 V logic level incompatibility

The Tang Nano 20K GPIO outputs 3.3 V logic. Many WS2812B strips require a logic-high
threshold of ≥0.7 × VDD. For a 5 V powered strip, 0.7 × 5 = 3.5 V — above the 3.3 V
output. Use a 3.3 V→5 V level shifter or a 74AHCT125 buffer to drive long external strips.
The on-board WS2812C-2020 runs from 3.3 V so it does not have this issue.

---

## Correct Architecture: Shift Register FSM

The reference implementation uses a **shift register** FSM avoiding all the above bugs:

```
FSM states:
  PHASE_RESET: hold ws2812 LOW, count TRESET_LAST+1 clocks.
               At end: latch frame into shiftReg, go to PHASE_BITS.

  PHASE_BITS:  Drive ws2812 = (timer < T0H) ? 1 :
                              (timer < T1H && shiftReg[23]) ? 1 : 0
               At timer = TBIT_LAST: shift shiftReg left by 1, advance bitCnt.
               At bitCnt = BITS_LAST: go to PHASE_RESET.
```

Key properties:
- `timer === TBIT_LAST` (exact) → exactly 30 clocks per bit, no fencepost
- `bitCnt === BITS_LAST` (exact on 23) → exactly 24 bits, no 25th bit
- `(shiftReg >> 23) & 1` inline in condition → current bit value, no staging register
- `TRESET_LAST = 9999` → 370 µs reset compatible with WS2812C-2020

---

## GRB Color Encoding Reference

WS2812 protocol bytes the GREEN channel first. The hex values stored in `frame` are GRB not RGB:

```
Color    frame value  GRB bytes
RED      0x00CC00     G=0x00  R=0xCC  B=0x00
YELLOW   0xCCCC00     G=0xCC  R=0xCC  B=0x00
GREEN    0xCC0000     G=0xCC  R=0x00  B=0x00
CYAN     0xCC00CC     G=0xCC  R=0x00  B=0xCC
BLUE     0x0000CC     G=0x00  R=0x00  B=0xCC
MAGENTA  0x00CCCC     G=0x00  R=0xCC  B=0xCC
```

To convert an RGB value to GRB frame: `frame = (G << 16) | (R << 8) | B`.

---

## Development Workflow

### Compile and inspect the generated SV

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/ws2812_demo \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/ws2812_demo

# Inspect the serialiser module:
sed -n '/module Ws2812Serialiser/,/endmodule/p' .artifacts/ws2812_demo/ws2812_demo.sv
```

**Checklist for the generated SV**:
- [ ] Reset timer uses `== TRESET_LAST` (equality, not `>=`)
- [ ] TRESET_LAST value is large enough for your LED chip (>=10000 for WS2812C-2020)
- [ ] Bit timer uses `== TBIT_LAST` (equality)
- [ ] Bit count check uses `== BITS_LAST` (equality on the last valid index = 23)
- [ ] Bit extraction is inline in the condition, not a declared `logic bitValue` register
- [ ] No `load` signal (that was the broken handshake)
- [ ] No `unresolved call` comment (all helpers were inlined)

### Flash to board

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/ws2812_demo \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/ws2812_demo --flash
```

Expected behaviour after flash:
- **Power on**: ws2812 dark, board LEDs off
- **S2 (pin 87) held**: ws2812 enters 370 µs reset then begins RED. Cycles every ~0.31 s:
  RED → YELLOW → GREEN → CYAN → BLUE → MAGENTA → RED → ...
- **S2 released**: ws2812 immediately dark (enable = 0), state resets to RED for next press
- **S1 (pin 88) held**: 6 board LEDs walk one at a time (every ~0.31 s)
- **S1 released**: all board LEDs off

### Run the test suite

```bash
bun test                                    # all 339 tests
bun test tests/class-compiler.test.ts      # compiler unit tests (includes helper inlining)
bun test packages/core/src/facades/hardware-examples-behavior.test.ts
```

---

## Oscilloscope / Logic Analyser Verification

Capture pin 79 with a logic analyser. For a correct transmission at 27 MHz:

| Measurement        | Expected                |
| ------------------ | ----------------------- |
| Reset pulse width  | ≥ 370 µs LOW            |
| Single bit period  | ~1111 ns (30 × 37 ns)   |
| T0H (bit '0' high) | ~333 ns (9 clocks)      |
| T1H (bit '1' high) | ~703 ns (19 clocks)     |
| Inter-frame gap    | Same as reset (≥370 µs) |
| Bits per frame     | Exactly 24              |

Use a protocol decoder set to "WS2812" or "NeoPixel" to decode the GRB bytes. The first
frame after pressing S2 should decode as `G=0x00 R=0xCC B=0x00` (RED in GRB).

---

## Debugging Checklist

**Step 1: Confirm the board LEDs work (S1)**
- If S1 does NOT cause the board LEDs to walk, the flash failed or the board is not in
  programming mode. Check `lsusb`, re-enter download mode, reflash.

**Step 2: Confirm the output pin is being driven**
- Measure continuity between FPGA pin 79 and the WS2812 DIN pad.
- Use a multimeter: with S2 held, pin 79 should toggle (average ~2 V if duty cycle is ~50%).
- With S2 released, pin 79 should read 0 V.

**Step 3: Check power to the WS2812**
- The on-board WS2812C-2020 is powered from 3.3 V. An external strip must be powered from
  5 V (or as required by the strip).

**Step 4: Check data voltage**
- The FPGA outputs 3.3 V. For on-board WS2812C-2020 this is fine (3.3 V power rail).
- For 5 V external strips: add a 74AHCT125 or SN74AHCT1G125 level shifter.

**Step 5: Inspect the generated SV**
- Run the checklist in "Compile and inspect the generated SV" above.
- If `logic bitValue` or `logic currentBit` appears as a module-level register, the
  compiler is creating a staging register that delays the bit-value by one clock. Use the
  inline expression approach instead.

**Step 6: Compare timing to datasheet**
- Download the exact datasheet for your LED chip (WS2812B vs WS2812C-2020 have different specs).
- Adjust `T0H_CLOCKS`, `T1H_CLOCKS`, `TBIT_LAST`, and `TRESET_LAST` to the correct values.

---

## See Also

- [board-definition-authoring.md](board-definition-authoring.md) - how ports map to physical pins
- [append-only-engineering-log.md](../append-only-engineering-log.md) - historical flash outcomes
- [production-readiness.md](../production-readiness.md) - hardware sign-off criteria
- [architecture.md](../architecture.md) - compiler pipeline overview
