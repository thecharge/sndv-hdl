# Scenarios — Compile and Flash

Acceptance scenarios for the CLI compile and flash workflow.

---

## SCENARIO: Single-file compile produces artifacts

GIVEN `examples/hardware/tang_nano_20k/blinker/blinker.ts` exists

WHEN:
```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/blinker/blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/blinker
```

THEN the command SHALL exit with code 0
AND `.artifacts/blinker/blinker.sv` SHALL exist
AND `.artifacts/blinker/blinker.cst` SHALL exist

ACCEPTANCE: Verified by `ls .artifacts/blinker/`.

---

## SCENARIO: Directory compile includes all .ts files

GIVEN `examples/hardware/tang_nano_20k/ws2812_demo/` contains multiple `.ts` files

WHEN compiled by passing the directory path

THEN the output `.sv` SHALL contain all module definitions from all `.ts` files
AND no file SHALL be silently excluded

ACCEPTANCE: `grep -c 'module ' .artifacts/ws2812_demo/ws2812_demo.sv` returns > 1.

---

## SCENARIO: --flash triggers synthesis and programs board

GIVEN Tang Nano 20K connected via USB with FT2232 programmer visible

WHEN:
```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/blinker/blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/blinker \
  --flash
```

THEN the CLI SHALL:
1. Compile TypeScript to SV
2. Run Yosys synthesis inside the container
3. Run nextpnr PnR
4. Run gowin_pack
5. Run openFPGALoader and show progress
6. Display a power-cycle reminder

ACCEPTANCE: All 6 steps complete; openFPGALoader shows 100% write and verify.

---

## SCENARIO: Compile error reports location

GIVEN a TypeScript source file with a syntax error (e.g., using ternary `?:`)

WHEN compiled

THEN the CLI SHALL print an error message including:
- The file name
- The line and column number
- The error code (e.g., TS2V-2000)
- A description of the unsupported construct

AND the CLI SHALL exit with non-zero code
AND no .sv file SHALL be produced

ACCEPTANCE: Error message is actionable; developer can locate and fix the issue.

---

## SCENARIO: Forbidden CLI invocation documented

GIVEN any documentation file in `docs/` or `README.md`

WHEN searched for `ts2v compile` or `ts2v build`

THEN NO matches SHALL be found (forbidden patterns)
AND only `bun run apps/cli/src/index.ts compile` SHALL appear

ACCEPTANCE: `grep -r 'ts2v compile' docs/ README.md` returns no results.
