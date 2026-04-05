# Quickstart: First Light on Tang Nano 20K

This guide takes you from nothing to a working WS2812 LED demo in the shortest number of steps.

---

## What You Need

- Tang Nano 20K board
- USB cable
- WS2812 LED strip or at least one WS2812 pixel
- Bun 1.3+, Podman or Docker installed

---

## Step 1 - Install

```bash
bun install
bun run toolchain:image:build
```

`toolchain:image:build` downloads and builds the synthesis container (Yosys, nextpnr, openFPGALoader).
This only needs to happen once.

---

## Step 2 - Wire the WS2812

Connect your WS2812 strip to the board:

| Strip wire | Board connection                                 |
| ---------- | ------------------------------------------------ |
| Data in    | Pin 79 (`PIN79_WS2812`)                          |
| GND        | Any GND pin on the board                         |
| VCC        | 5V from a separate supply (not the board's 3.3V) |

> The onboard WS2812C-2020 is already wired to pin 79. If you only want to test with
> that one LED you can skip the external strip entirely.

> If your strip runs at 5V logic and stays dark, you may need a 3.3V-to-5V level
> shifter on the data line. The onboard LED works fine at 3.3V.

---

## Step 3 - Put the Board in Programming Mode

Hold the **S1 button** while plugging in the USB cable (or while pressing reset).
This puts the board in download mode so the programmer can reach it.

---

## Step 4 - Check the Programmer is Visible

```bash
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```

You should see a line containing `0x0403:0x6010` or `FTDI2232` or `SIPEED`.

If you see nothing:
- check the USB cable is plugged in
- confirm the board is in programming mode (step 3)
- run `lsusb` to verify the device is visible to the OS at all

---

## Step 5 - Flash the WS2812 Demo

```bash
bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/ws2812_demo \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/ws2812_demo \
  --flash
```

A successful flash looks like this:

```
write to flash
Detected: Winbond W25Q64 128 sectors size: 64Mb
Writing:  [==================================================] 100.00%  Done
Verifying write (May take time)
Done
```

The board resets automatically after flashing. The WS2812 should start cycling
colours within a second.

---

## Step 6 - Check It Works

| What you see                    | What it means              |
| ------------------------------- | -------------------------- |
| WS2812 cycling colours          | Working                    |
| WS2812 completely dark          | See troubleshooting below  |
| Flash says `DONE` but no colour | Power cycle the board once |

The design is written to external flash so it survives a power cycle.

---

## Troubleshooting

**WS2812 is dark after a successful flash:**

1. Check the data wire is on pin 79, not a neighbouring pin.
2. Check GND is shared between the strip and the board.
3. Check the strip has enough power (long strips need their own 5V supply).
4. Power cycle the board once.

**Programmer not found:**

```bash
lsusb   # check the device is visible to the OS first
```

If the device shows in `lsusb` but not in the container:
```bash
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```

If you see `Access denied`, fix the permission:
```bash
sudo usermod -aG dialout $USER
```
Then log out and back in. For more detail, see `docs/guides/user-usb-debugger-onboarding.md`.

---

## Next Steps

| What you want to do                              | Where to go                                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control rainbow colours from your PC over serial | [aurora_uart README](../examples/hardware/tang_nano_20k/aurora_uart/README.md)                                                                                      |
| Run a calculator on the FPGA                     | [calc_uart README](../examples/hardware/tang_nano_20k/calc_uart/README.md)                                                                                          |
| Flash the basic blinker first                    | `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/blinker/blinker.ts --board boards/tang_nano_20k.board.json --out .artifacts/blinker --flash` |
| Write your own hardware module                   | [docs/guides/end-to-end-delivery.md](guides/end-to-end-delivery.md)                                                                                                 |
| Understand WS2812 timing                         | [docs/guides/ws2812-protocol-and-brightness.md](guides/ws2812-protocol-and-brightness.md)                                                                           |
| Debug a WS2812 that won't light up               | [docs/guides/ws2812-debug-guide.md](guides/ws2812-debug-guide.md)                                                                                                   |
