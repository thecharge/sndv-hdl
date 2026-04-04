# Constraints — board-configuration-and-support

---

## OSS Board Gating Rule (Hard Constraint)

A board MUST NOT appear in `SupportedBoardId` or `configs/workspace.config.json` as a
synthesis-capable board until ALL of the following are verified and logged:

1. Yosys plugin for the target FPGA family works (`synth_gowin`, `synth_ecp5`, etc.)
2. nextpnr variant works for the FPGA family
3. Bitstream pack tool produces a valid bitstream
4. openFPGALoader flashes the bitstream to the physical device
5. The board reloads from flash on power cycle (if applicable)
6. At least one example (minimum: blinker) passes real-hardware testing
7. All of the above are logged in `docs/append-only-engineering-log.md`

This constraint cannot be relaxed. "It probably works" is not sufficient.

---

## Currently Defined Boards

| Board | File | Status |
|---|---|---|
| Tang Nano 20K | `boards/tang_nano_20k.board.json` | Production — all gates passed |
| Tang Nano 20K (min LED) | `boards/tang_nano_20k_min_led.board.json` | Variant |
| Tang Nano 20K (LED0 only) | `boards/tang_nano_20k_led0_only.board.json` | Variant |
| Tang Nano 9K | `boards/tang_nano_9k.board.json` | Supported |
| Arty A7 | `boards/arty_a7.board.json` | Constraint-gen only; no synthesis |

---

## Forbidden Board Additions

The following boards SHALL NOT be added to the synthesis flow until a complete OSS path
is verified:
- DE10-Nano (Intel Cyclone V) — requires Quartus; no viable OSS synthesis path
- Any Xilinx 7-series board for synthesis — nextpnr-xilinx still requires xraydb
  from Vivado as of the bootstrap date

Arty A7 (Xilinx XC7A35T) MAY generate `.xdc` constraint files but SHALL NOT be used
for synthesis until a fully self-contained OSS path exists for Xilinx 7-series.

---

## Board JSON Schema Rules

Board JSON files MUST:
- Specify signal names that match the TypeScript hardware source port names exactly
- Include a `clockHz` field for timing calculations
- Include `programmers` array with at least one profile for the supported flash tool
- Use `IO_LOC` directive syntax for Gowin, `set_property PACKAGE_PIN` for Xilinx

---

## Tang Nano 20K Electrical Notes

These constraints must be reflected in any example targeting this board:
- LEDs are active-LOW: 0=ON, 0x3F=all off. Hardware examples must initialize LEDs to 0x3F.
- `btn` (pin 87, S2) and `rst_n` (pin 88, S1) are active-HIGH with pull-down to GND at rest.
  Pressing drives the pin to 3.3V. Do NOT treat these as standard active-low resets.
- WS2812 on-board LED is a WS2812C-2020 variant requiring T_RESET > 280 µs (NOT 50 µs).
  The serialiser uses 370 µs (10,000 clocks at 27 MHz).
- External 5V WS2812B strips may require a 74AHCT125 level shifter for reliable operation.
- UART: `/dev/ttyUSB0` is JTAG only; `/dev/ttyUSB1` (or higher) is the UART data port.
