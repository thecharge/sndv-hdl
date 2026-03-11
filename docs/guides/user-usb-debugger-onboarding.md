# User Runbook: USB Debugger Onboarding (Bootloader -> Flash)

## Audience
This is an operator-facing guide. Use this when you are holding the board and need to make flashing work on a Linux host.

## Goal
You want three things to be true:
1. You can identify the board debugger USB device by unplug/replug delta.
2. Your host permissions allow that USB device to be opened from containerized `openFPGALoader`.
3. Flash works with profile retries already configured in this workspace.

## Prerequisites
- Board connected by data-capable USB cable.
- Board in bootloader/program mode (S2 workflow per board manual).
- Toolchain image built:
```bash
bun run toolchain:image:build
```

## Step 1: Confirm Which USB Device Is The Board Debugger

### 1.1 Capture baseline USB list
```bash
lsusb | sort > /tmp/lsusb.before.txt
cat /tmp/lsusb.before.txt
```

### 1.2 Unplug board, then capture list
```bash
lsusb | sort > /tmp/lsusb.unplugged.txt
```

### 1.3 Plug board back in bootloader mode, then capture list
```bash
lsusb | sort > /tmp/lsusb.bootloader.txt
```

### 1.4 Show delta (what appeared/disappeared)
```bash
comm -3 /tmp/lsusb.unplugged.txt /tmp/lsusb.bootloader.txt || true
```

Interpretation:
- Lines only in `bootloader` are candidates for the onboard debugger.
- If multiple candidates appear, keep all of them for profile testing.

### 1.5 Extract candidate VID:PID list
```bash
awk '{print $6}' /tmp/lsusb.bootloader.txt | sort -u
```

Example from your host sample:
- `0403:6010` (FTDI, strong onboard debugger candidate)
- `10ab:9309`
- `27c6:6594`

## Step 2: Ensure Host Permissions/Udev Allow USB Access

Host visibility (`lsusb`) is not enough. The user and container runtime must be allowed to open device nodes.

### 2.1 Find exact USB device path
Use the bus/device numbers from `lsusb` for a candidate device.

Example if device is `Bus 001 Device 004`:
```bash
ls -l /dev/bus/usb/001/004
```

### 2.2 Inspect existing udev properties
Replace `001/004` with your candidate path.
```bash
udevadm info -a -n /dev/bus/usb/001/004 | head -n 120
```

### 2.3 Create udev rule for candidate VID:PID
Create `/etc/udev/rules.d/99-ts2v-debugger.rules`:
```bash
sudo tee /etc/udev/rules.d/99-ts2v-debugger.rules >/dev/null <<'EOF'
# ts2v debugger access (examples from current host)
SUBSYSTEM=="usb", ATTR{idVendor}=="0403", ATTR{idProduct}=="6010", MODE="0666", GROUP="plugdev", TAG+="uaccess"
SUBSYSTEM=="usb", ATTR{idVendor}=="10ab", ATTR{idProduct}=="9309", MODE="0666", GROUP="plugdev", TAG+="uaccess"
SUBSYSTEM=="usb", ATTR{idVendor}=="27c6", ATTR{idProduct}=="6594", MODE="0666", GROUP="plugdev", TAG+="uaccess"
EOF
```

Why this is required:
- By default, many USB debugger nodes are owned by `root:root` with restrictive permissions.
- `MODE="0666"` and `TAG+="uaccess"` ensure your active desktop/login session can open the device.
- `GROUP="plugdev"` provides a stable group-based fallback for non-desktop sessions.
- Without this step, containerized `openFPGALoader` commonly fails with:
  - `Access denied (insufficient permissions)`
  - `unable to open ftdi device`

If your distro uses `dialout` instead of `plugdev`, swap group accordingly.

### 2.4 Reload rules and re-enumerate device
```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Why these two commands are needed:
- `udevadm control --reload-rules` makes `udevd` read your new rule file.
- `udevadm trigger` re-applies rules to currently connected devices so you do not need a full reboot.
- Replugging afterward guarantees the debugger device is created with updated permissions.

Unplug/replug board and re-enter bootloader mode.

### 2.5 Verify permissions on device node
```bash
ls -l /dev/bus/usb/001/004
```
Expected:
- group-readable/writable access for your user group, or
- `TAG+="uaccess"` granting your active session access.

### 2.6 Verify your user groups
```bash
id
```
If needed:
```bash
sudo usermod -aG plugdev "$USER"
newgrp plugdev
```

## Step 3: Verify Container-Level Probe Visibility

### 3.1 Basic USB scan inside container
```bash
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb
```
Expected:
- non-empty probe table.

If still empty, try a diagnostic privileged scan (for troubleshooting only):
```bash
podman run --rm --privileged --device /dev/bus/usb -v /dev:/dev ts2v-gowin-oss:latest openFPGALoader --scan-usb
```

If privileged scan sees probes but standard scan does not, this is a host permission/policy issue.

## Step 4: Configure Programmer Profiles (Already Supported)

Profiles are configured in `configs/workspace.config.json` under your board.

Current workspace includes profile retries for:
- autodetect
- `cmsisdap` with `10ab:9309`
- `cmsisdap` with `27c6:6594`

You can add more profiles as needed.

## Step 5: Re-run Flash (Profile Retries Are Automatic)

```bash
bun run apps/cli/src/index.ts compile examples/hardware/usb_jtag_probe_blinker.ts \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/usbjtag \
  --flash
```

The toolchain will attempt:
1. board autodetect
2. each configured programmer profile

## Step 6: Read Results From Output

Success indicators:
- no `JTAG init failed`
- no `unable to open ftdi device`
- bitstream written/programmed message from `openFPGALoader`

Common failures:
- `scan-usb` empty: permissions or wrong mode/cable.
- `No device found` on `cmsisdap`: cable/protocol mismatch for that VID:PID.
- `unable to open ftdi device`: not an FTDI probe path or access denied.
- `Error: can't open device ... Access denied (insufficient permissions)`: host udev/group permissions are not granting access to current user/container runtime.

## What To Send Back If It Still Fails
Provide these command outputs:
1. `lsusb`
2. `podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb`
3. `id`
4. `ls -l /dev/bus/usb/<bus>/<dev>` for candidate devices
5. Full `compile --flash` output

With those five outputs, profile and permission tuning can be completed deterministically.
