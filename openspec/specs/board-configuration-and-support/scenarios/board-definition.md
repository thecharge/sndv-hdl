# Scenarios — Board Definition

Acceptance scenarios for board definition authoring and constraint generation.

---

## SCENARIO: New board definition produces valid .cst file

GIVEN a new board JSON file in `boards/` with a valid Gowin pin map

WHEN the compiler runs with `--board <new-board>.board.json`

THEN a `.cst` file SHALL be generated in the output directory
AND each signal in the board definition SHALL appear as an `IO_LOC` directive
AND each signal SHALL include the appropriate `IO_PORT` attribute for I/O standard

ACCEPTANCE: Generated .cst is accepted by nextpnr-himbaechel without constraint errors.

---

## SCENARIO: Arty A7 produces .xdc but no synthesis

GIVEN `boards/arty_a7.board.json`

WHEN the compiler runs with `--board boards/arty_a7.board.json`

THEN a `.xdc` file SHALL be generated with `set_property PACKAGE_PIN` directives
AND the toolchain SHALL NOT attempt to invoke Yosys or nextpnr for Arty A7
AND the CLI SHALL display a message indicating constraint-gen-only status

ACCEPTANCE: .xdc file is present; no synthesis artifact (.fs or .json netlist) is produced.

---

## SCENARIO: Board admission gate enforced

GIVEN an attempt to add a new board to `SupportedBoardId` without a confirmed flash log

WHEN a code review or CI gate is triggered

THEN the PR or change SHALL be rejected unless `docs/append-only-engineering-log.md`
contains a confirmed flash entry for that board

ACCEPTANCE: AGENTS.md handoff contract and this spec explicitly state this requirement.

---

## SCENARIO: Tang Nano 20K LED polarity is correct

GIVEN the blinker example targeting Tang Nano 20K with `led: Logic<6> = 0x3F`

WHEN the bitstream is flashed and the board powers up

THEN all 6 LEDs SHALL be OFF initially (0x3F is all-off for active-LOW LEDs)
AND as the counter increments, LEDs SHALL light up one at a time

ACCEPTANCE: Observed behavior on real hardware matches expectation.

---

## SCENARIO: WS2812 reset pulse exceeds 280 µs minimum

GIVEN the WS2812 serialiser targeting Tang Nano 20K's on-board WS2812C-2020 (pin 79)

WHEN the reset pulse is generated

THEN the pulse duration SHALL be at least 280 µs
AND the reference implementation uses 370 µs (10,000 clocks at 27 MHz = 370 µs)
AND the WS2812C-2020 SHALL latch all pixel data after the reset pulse

ACCEPTANCE: On-board LED changes color or turns on after the reset pulse without
requiring the 50 µs value used for external WS2812B strips.

---

## SCENARIO: Board clock frequency drives timing constants

GIVEN Tang Nano 20K has `clockHz: 27000000` in its board definition
AND a UART module uses `const BIT_PERIOD = 234` for 115200 baud

WHEN compiled

THEN the constant 234 matches the expected bit period at 27 MHz (27,000,000 / 115,200 ≈ 234)
AND the baud rate error SHALL be less than 0.2%

ACCEPTANCE: `aurora_uart` UART works at 115200 baud on real hardware.
