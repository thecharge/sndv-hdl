# Scenarios — Synthesis and Flash

Acceptance scenarios for the full OSS synthesis-to-flash pipeline.

---

## SCENARIO: Container image builds successfully

GIVEN a fresh checkout of the repository with Docker or Podman installed

WHEN `bun run toolchain:image:build` is executed

THEN the command SHALL exit with code 0
AND the `ts2v-gowin-oss:latest` image SHALL be available in the local registry
AND the image SHALL include: yosys, nextpnr-himbaechel, gowin_pack, openFPGALoader, iverilog

ACCEPTANCE: `podman images` or `docker images` shows `ts2v-gowin-oss:latest`.

---

## SCENARIO: Blinker compiles and synthesizes successfully

GIVEN the `ts2v-gowin-oss:latest` image is built
AND `boards/tang_nano_20k.board.json` exists

WHEN the compile command is run:
```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/blinker/blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/blinker
```

THEN the command SHALL exit with code 0
AND `.artifacts/blinker/blinker.sv` SHALL exist
AND `.artifacts/blinker/blinker.cst` SHALL exist
AND `.artifacts/blinker/blinker.fs` (bitstream) SHALL exist

ACCEPTANCE: All three artifact files are present; no synthesis errors in stdout.

---

## SCENARIO: Tang Nano 20K flash succeeds (real hardware)

GIVEN the blinker bitstream is compiled as above
AND a Tang Nano 20K is connected via USB
AND the USB programmer is detected (`lsusb` shows FT2232 device)
AND the user is in the `dialout` group (or has USB permissions)

WHEN `--flash` is added to the compile command

THEN openFPGALoader SHALL produce output including:
```
Detected: Winbond W25Q64 128 sectors size: 64Mb
Writing:  [==================================================] 100.00%  Done
Verifying write ... Reading: [==================================================] Done
```
AND the command SHALL exit with code 0
AND after power cycle, the 6 onboard LEDs SHALL blink in sequence

ACCEPTANCE: Flash output matches pattern; behavior persists after USB power cycle.
This result MUST be logged in `docs/append-only-engineering-log.md`.

---

## SCENARIO: Synthesis fails gracefully on invalid SV

GIVEN a SystemVerilog file with a syntax error (e.g., missing `endmodule`)

WHEN Yosys synthesis is invoked via the toolchain adapter

THEN the toolchain SHALL report the Yosys error message to stderr
AND SHALL exit with a non-zero status code
AND SHALL NOT produce a corrupt bitstream file

ACCEPTANCE: CLI exits non-zero; error message references the .sv file.

---

## SCENARIO: USB probe scan validates programmer presence

GIVEN Podman is installed and `ts2v-gowin-oss` image is built

WHEN `podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb` is executed

THEN with Tang Nano 20K connected: the output SHALL list the FT2232-based programmer
THEN with no board: the output SHALL return an empty list (not crash)

ACCEPTANCE: Command exits 0 in both cases; board present case shows FTDI device.

---

## SCENARIO: UVM simulation produces JSON report

GIVEN compiled .sv for `examples/alu/alu.ts`

WHEN `bun run test:uvm` is executed

THEN `.artifacts/uvm/reports/uvm-alu-report.json` SHALL be created
AND `.artifacts/uvm/reports/uvm-alu-report.md` SHALL be created
AND the JSON report SHALL include pass/fail status per test vector
AND the command SHALL exit with code 0 if all tests pass

ACCEPTANCE: Report files exist after `bun run test:uvm`.
