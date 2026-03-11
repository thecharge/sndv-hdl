# Hardware Toolchain Guide

## Scope
This repository uses a reproducible open-source flow for Tang Nano boards:
1. `yosys` synthesis with `synth_gowin`
2. `nextpnr-himbaechel` place-and-route
3. `gowin_pack` bitstream generation
4. `openFPGALoader` device programming

## Target Boards
- Tang Nano 20K: `GW2AR-LV18QN88C8/I7`
- Tang Nano 9K: `GW1NR-LV9QN88PC6/I5`

## Container Strategy
- Primary runtime: `podman`
- Fallback runtime: `docker`
- Config source: `configs/workspace.config.json`
- Image tag used by default: `ts2v-gowin-oss:latest`

This repo no longer depends on `ghcr.io/yosyshq/oss-cad-suite` pull behavior.

## Build the Toolchain Image
```bash
bun run toolchain:image:build
```

Runtime-specific:
```bash
bun run toolchain:image:build:podman
bun run toolchain:image:build:docker
```

Dockerfile source: `toolchain/Dockerfile`

## End-to-End Compile + Flash
```bash
bun run apps/cli/src/index.ts compile examples/blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/tang20k \
  --flash
```

Generated artifacts are in `.artifacts/tang20k`.

## Tang Nano 20K Programming Sequence
Use the board's S2/program mode workflow first, then validate probe visibility before flashing.

```bash
lsusb
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```

When a probe is visible, flash with:

```bash
podman run --rm -v "$PWD:/workspace" -w /workspace --device /dev/bus/usb \
  ts2v-gowin-oss:latest openFPGALoader -b tangnano20k .artifacts/tang20k/tang_nano_20k_blinker.fs
```

If `openFPGALoader --scan-usb` returns an empty table, do not attempt flash yet. Re-enter board programming mode and re-check.

## Programmer Profile Automation
Flash now supports profile-based retries configured in `configs/workspace.config.json` per board.

Example board config snippet:
```json
"programmerProfiles": [
  {
    "name": "board-autodetect",
    "extraArgs": []
  },
  {
    "name": "usi-cmsisdap",
    "cable": "cmsisdap",
    "vid": "0x10ab",
    "pid": "0x9309"
  }
]
```

Behavior:
1. Tries board autodetect
2. Tries each configured profile
3. Logs each profile command and scan output

See full field mapping and workflow in:
- `docs/guides/programmer-profiles-and-usb-permissions.md`
- `docs/guides/user-usb-debugger-onboarding.md`

## USB Access Notes
The container command maps `/dev/bus/usb` by default via `usbDevicePaths` in `configs/workspace.config.json`.

Important:
- Host `lsusb` visibility does not imply container probe visibility.
- Container and host permission models differ.
- If `--scan-usb` is empty in container, fix host permissions/rules first, then retry profile attempts.

If programmer access still fails:
- Verify probe visibility: `lsusb`
- Verify openFPGALoader USB scan: `openFPGALoader --scan-usb`
- Ensure user permissions for USB device nodes
- Retry with elevated runtime permissions only if required by host policy

## Verified External Resources
- Lushay Labs Tang Nano setup: https://learn.lushaylabs.com/getting-setup-with-the-tang-nano-9k/
- Yosys: https://yosyshq.net/yosys/
- nextpnr: https://github.com/YosysHQ/nextpnr
- Apicula/gowin_pack: https://github.com/YosysHQ/apicula
- openFPGALoader: https://github.com/trabucayre/openFPGALoader
- Podman docs: https://podman.io/docs
- Docker docs: https://docs.docker.com/

## Explicitly Avoided
- `hdl.github.io/containers` (abandoned)
- Non-existent or access-denied prebuilt images as the only dependency path
