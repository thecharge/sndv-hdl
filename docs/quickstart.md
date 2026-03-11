# Quickstart: WS2812 First Light

This is the shortest end-to-end path to visible WS2812 behavior on Tang Nano 20K.

## Target Outcome
You should see all of these:
- successful flash logs (`write to flash`, `Verifying write`, `DONE`),
- onboard heartbeat LED toggling,
- WS2812 strip color changes.

## 1. One-Time Setup
```bash
git clone <your-repo-url> ts2v
cd ts2v
bun install
bun run toolchain:image:build
```

## 2. Wire WS2812 Correctly
Use this exact mapping for this workspace:
- data in: Tang Nano 20K `PIN79_WS2812` (`ws2812` in `boards/tang_nano_20k.board.json`)
- ground: board GND -> strip GND
- power: strip VCC from a valid supply

If ground is not shared, data is invalid even when flash succeeds.
If strip is powered at 5V and still dark, use a 3.3V->5V logic level shifter on data.

## 3. Confirm Programmer Visibility
```bash
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```

You should see the FTDI probe row (for example `0x0403:0x6010`).

## 4. Flash WS2812 Demo (Persistent External Flash)
```bash
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_ws2812b.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/ws2812 \
  --flash
```

Pass markers in logs:
- `openFPGALoader --external-flash --write-flash --verify -r`
- `write to flash`
- `Detected: Winbond W25Q64`
- `Verifying write (May take time)`
- `Done` / `DONE`

## 5. Verify On Real Hardware
Check in this order:
1. onboard heartbeat LED toggles,
2. WS2812 strip changes color,
3. power-cycle board and confirm behavior persists.

## 6. If You Still See No WS2812
Run this checklist only:
1. Confirm pin is still `79` in `boards/tang_nano_20k.board.json`.
2. Confirm strip data wire is on that board pin net.
3. Confirm common GND between board and strip.
4. Confirm strip power/current are sufficient.
5. Reflash once and check for `--external-flash --write-flash --verify -r` in output.
6. Check `docs/guides/ws2812-protocol-and-brightness.md` for brightness/protocol details.

## Next Docs
- `docs/guides/tang_nano_20k_programming.md`
- `docs/guides/board-definition-authoring.md`
- `docs/guides/ws2812-protocol-and-brightness.md`
- `docs/guides/production-reality-check.md`
- `docs/guides/debugging-and-troubleshooting.md`
