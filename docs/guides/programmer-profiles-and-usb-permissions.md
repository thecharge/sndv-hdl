# Programmer Profiles And USB Permissions

## Why This Exists
Different onboard USB-debugger chips expose different USB identities and may require different `openFPGALoader` flags.
A single hardcoded programmer invocation is not production-ready.

For an operator-focused, copy-paste runbook, use:
- `docs/guides/user-usb-debugger-onboarding.md`

This workspace now supports per-board programmer profiles in `configs/workspace.config.json`.
Each profile can provide explicit cable and USB arguments.

## Supported Profile Fields
Under each board entry, define `programmerProfiles`:

```json
{
  "name": "usi-cmsisdap",
  "cable": "cmsisdap",
  "vid": "0x10ab",
  "pid": "0x9309",
  "cableIndex": 0,
  "busdevNum": "1:4",
  "ftdiSerial": "",
  "ftdiChannel": 0,
  "extraArgs": ["--verbose"]
}
```

Field mapping to openFPGALoader:
- `cable` -> `-c`
- `vid` -> `--vid`
- `pid` -> `--pid`
- `cableIndex` -> `--cable-index`
- `busdevNum` -> `--busdev-num`
- `ftdiSerial` -> `--ftdi-serial`
- `ftdiChannel` -> `--ftdi-channel`
- `extraArgs` -> appended as-is

## Runtime Behavior
During flash, the toolchain now does:
1. board autodetect attempt
2. each configured programmer profile attempt

For every attempt it logs:
- selected profile name
- exact container command
- `openFPGALoader --scan-usb` output
- flash output/error

## What You Need To Do On Your Machine
1. Put board into programming/bootloader mode per board manual.
2. Run `lsusb` and identify candidate devices that appear/disappear with board mode.
3. Add one or more `programmerProfiles` for your board in `configs/workspace.config.json`.
4. Run:
```bash
bun run apps/cli/src/index.ts compile <input.ts> --board boards/tang_nano_20k.board.json --out .artifacts/tang20k --flash
```
5. If all attempts fail, use profile-specific manual probe tests:
```bash
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader -c cmsisdap --vid 0x10ab --pid 0x9309 --detect
```

## Host Vs Container Permissions
Host and container permissions differ. Seeing a USB device in host `lsusb` does not guarantee container access.

Checklist:
1. Confirm host sees candidate USB device via `lsusb`.
2. Confirm container sees probe via `openFPGALoader --scan-usb`.
3. Ensure container gets device mapping: `--device /dev/bus/usb`.
4. If scan is empty, verify host udev permissions/group access for the current user.
5. Re-plug board and re-enter bootloader mode, then retry.

## Notes About Candidate IDs
In your provided sample:
- `0403:6010` is an FTDI-class debugger ID and a strong JTAG probe candidate.
- `10ab:9309` is a plausible debugger candidate.
- `27c6:6594` can be a non-debug peripheral on many laptops.

Both can be profiled and tested automatically, but only a probe driver that matches actual firmware/protocol will succeed.

Example FTDI/CH552 profile:
```json
{
  "name": "ftdi-ch552-jtag",
  "cable": "ch552_jtag",
  "vid": "0x0403",
  "pid": "0x6010"
}
```

## Production Guidance
For real deployments:
- keep multiple profiles per board model
- version-control known-good profiles per hardware revision
- record successful profile in `docs/append-only-engineering-log.md`
- do not mark production-ready until at least one profile demonstrates repeatable flash on real hardware
