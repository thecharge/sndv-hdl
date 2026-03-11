# Tang Nano 20K Programming Runbook

This runbook gives an exact, reproducible programming workflow for Tang Nano 20K.

## What This Runbook Solves
- reliable USB probe detection,
- persistent programming (survives power cycle),
- repeatable verification steps.

## Prerequisites
- board connected by USB,
- board in programming mode,
- toolchain image built: `bun run toolchain:image:build`.

## Step 1: Verify Host USB Detection
```bash
lsusb
```
You should see your programmer appear after entering programming mode.

## Step 2: Verify Container USB Detection
```bash
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```
If this is empty, flashing from this repo will fail until permissions/runtime mapping are fixed.

## Step 3: Build Bitstream
```bash
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/tang20k
```

Expected output artifact:
- `.artifacts/tang20k/tang_nano_20k_blinker.fs`

## Step 4: Program External Flash (Persistent)
```bash
podman run --rm \
  -v "$PWD:/workspace" -w /workspace \
  --device /dev/bus/usb \
  ts2v-gowin-oss:latest \
  openFPGALoader --external-flash --write-flash --verify -r -b tangnano20k \
  .artifacts/tang20k/tang_nano_20k_blinker.fs
```

Expected success lines:
- `write to flash`
- `Detected: Winbond ...`
- `Verifying write (May take time)`
- `DONE`

## Step 5: Power-Cycle Validation
Power off/on board. If behavior disappears:
- recheck flash mode used,
- verify board boot source,
- verify pin mapping and output polarity.

## WS2812 Demo Programming
```bash
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_ws2812b.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/ws2812 \
  --flash
```

WS2812-specific notes:
- strip must be physically connected,
- shared ground is mandatory,
- wrong pin mapping gives successful flash but no visible strip output.

## Common Error Signatures
- `unable to open ftdi device`: access or probe selection issue.
- empty scan table: board mode or container USB permissions issue.
- `Unconstrained IO`: board definition and top port names do not match.

## Related Guides
- `docs/guides/board-definition-authoring.md`
- `docs/guides/debugging-and-troubleshooting.md`
- `docs/guides/programmer-profiles-and-usb-permissions.md`
