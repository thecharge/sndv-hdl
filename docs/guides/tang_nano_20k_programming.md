# Tang Nano 20K Programming Runbook

## Scope
This runbook documents the exact detect/program sequence used in this repository for Tang Nano 20K.

## Preconditions
- Board connected over USB-C.
- Board put in programming mode using on-board controls (S2 sequence per board manual/workflow).
- Local toolchain image built: `bun run toolchain:image:build`.

## 1. Confirm Host USB Visibility
```bash
lsusb
```
Expected: a new USB device entry appears after entering programming mode and reconnecting/resetting the board.

## 2. Confirm Programmer Visibility In Container
```bash
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```
Expected: one or more probes listed.

If output is:
```text
empty
Bus device vid:pid       probe_type manufacturer serial product
```
then container runtime does not currently see a usable programming probe.

## 3. Build Bitstream
```bash
bun run compile:example
```
Expected artifact:
- `.artifacts/tang20k/tang_nano_20k_blinker.fs`

## 4. Program Board
```bash
podman run --rm \
  -v "$PWD:/workspace" -w /workspace \
  --device /dev/bus/usb \
  ts2v-gowin-oss:latest \
  openFPGALoader -b tangnano20k .artifacts/tang20k/tang_nano_20k_blinker.fs
```

## 5. Failure Signatures
- `unable to open ftdi device: -3 (device not found)`:
  - probe not visible to container
  - board not in expected programming state
  - host permissions/rules not applied for current user session

## 6. Fast Recheck Loop
Use this after each board mode change:
```bash
lsusb
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```
Only proceed to flashing when scan output shows a probe.
