# Podman and Toolchain Reference

Complete reference for the containerised FPGA toolchain: what it is, how it works,
all available Podman commands, and one-liner Python/Bash diagnostics.

---

## What the Container Contains

The `ts2v-gowin-oss` Docker/Podman image packages the entire open-source FPGA synthesis
chain for Gowin FPGAs:

| Tool             | Purpose                                 | Version |
| ---------------- | --------------------------------------- | ------- |
| `yosys`          | RTL synthesis (SystemVerilog → netlist) | latest  |
| `nextpnr-gowin`  | Place and route (netlist → bitstream)   | latest  |
| `gowin_pack`     | Pack nextpnr output to Gowin `.fs` file | latest  |
| `openFPGALoader` | Flash bitstream to FPGA via USB/JTAG    | latest  |

All tools are open-source and fully vendor-independent — no Vivado, Quartus, or Gowin EDA
IDE required.

---

## First-Time Setup

### 1. Install Podman

```bash
# Ubuntu / Debian
sudo apt-get install -y podman

# Fedora / RHEL
sudo dnf install -y podman

# Arch Linux
sudo pacman -S podman
```

Verify:
```bash
podman --version
```

### 2. Build the Toolchain Image

From the repo root:

```bash
bun run toolchain:image:build:podman
```

This builds the `ts2v-gowin-oss:latest` image locally.  First build takes 5-15 minutes
(downloads and compiles Yosys, nextpnr-gowin, openFPGALoader from source).

```bash
# Verify the image was built:
podman images | grep ts2v-gowin-oss
```

### 3. USB Device Access

openFPGALoader needs access to the USB JTAG device.  The `--device /dev/bus/usb` flag
in the Podman commands below passes the whole USB bus into the container.

For serial port access on the host (outside the container), add your user to `dialout`:

```bash
sudo usermod -aG dialout $USER
# Log out and back in for this to take effect.
```

---

## Compile Commands

### Compile Only (no flash)

```bash
# Single-file example
podman run --rm \
  -v $(pwd):/workspace \
  ts2v-gowin-oss:latest \
  bun run /workspace/apps/cli/src/index.ts compile \
    /workspace/examples/hardware/tang_nano_20k/blinker/blinker.ts \
    --board /workspace/boards/tang_nano_20k.board.json \
    --out /workspace/.artifacts/blinker

# Multi-file example (pass the directory)
podman run --rm \
  -v $(pwd):/workspace \
  ts2v-gowin-oss:latest \
  bun run /workspace/apps/cli/src/index.ts compile \
    /workspace/examples/hardware/tang_nano_20k/ws2812_demo \
    --board /workspace/boards/tang_nano_20k.board.json \
    --out /workspace/.artifacts/ws2812_demo

# Hardware example with hw/ + client/ split
podman run --rm \
  -v $(pwd):/workspace \
  ts2v-gowin-oss:latest \
  bun run /workspace/apps/cli/src/index.ts compile \
    /workspace/examples/hardware/tang_nano_20k/aurora_uart/hw \
    --board /workspace/boards/tang_nano_20k.board.json \
    --out /workspace/.artifacts/aurora_uart
```

### Compile and Flash (--flash flag)

```bash
podman run --rm \
  -v $(pwd):/workspace \
  --device /dev/bus/usb \
  ts2v-gowin-oss:latest \
  bun run /workspace/apps/cli/src/index.ts compile \
    /workspace/examples/hardware/tang_nano_20k/uart_echo \
    --board /workspace/boards/tang_nano_20k.board.json \
    --out /workspace/.artifacts/uart_echo \
    --flash
```

### Flash a Pre-Built Bitstream (SRAM — immediate, no power-cycle)

Programs FPGA SRAM directly.  Bitstream runs immediately without power-cycling.
SRAM is volatile — this is lost on power-off.  Use for fast iteration during debugging.

```bash
podman run --rm \
  -v $(pwd):/workspace \
  --device /dev/bus/usb \
  ts2v-gowin-oss:latest \
  openFPGALoader -b tangnano20k /workspace/.artifacts/uart_echo/hw.fs
```

### Flash to External Flash (persistent, survives power-off)

Programs the Winbond W25Q64 external flash.  Bitstream loads automatically on power-on.
**Requires a power-cycle after flashing** — the GW2AR-18C does not reliably reload from
flash after a JTAG reset.

```bash
podman run --rm \
  -v $(pwd):/workspace \
  --device /dev/bus/usb \
  ts2v-gowin-oss:latest \
  openFPGALoader -b tangnano20k --external-flash --write-flash \
    /workspace/.artifacts/uart_echo/hw.fs
```

---

## Synthesis Artifacts

After compilation, `.artifacts/<example>/` contains:

| File                | Description                            |
| ------------------- | -------------------------------------- |
| `hw.sv`             | Generated IEEE 1800-2017 SystemVerilog |
| `tang_nano_20k.cst` | Pin constraint file (.cst format)      |
| `hw.json`           | Yosys synthesised netlist (JSON)       |
| `hw_pnr.json`       | nextpnr placed-and-routed netlist      |
| `hw.fs`             | Final Gowin bitstream                  |
| `sim.f`             | Filelist for simulator                 |

To inspect the generated SV before synthesis:

```bash
cat .artifacts/uart_echo/uart_echo.sv
```

To check pin assignments:

```bash
cat .artifacts/uart_echo/tang_nano_20k.cst | grep uart
```

---

## Run Simulation (UVM-style testbenches)

```bash
bun run test:uvm
```

Or manually with Podman:

```bash
podman run --rm \
  -v $(pwd):/workspace \
  ts2v-gowin-oss:latest \
  bash -c "cd /workspace && bun run test:uvm"
```

---

## Python UART Diagnostics

All one-liners require `pyserial`:
```bash
pip install pyserial
```

### Auto-detect the UART port

```bash
python3 -c "import glob; ports=sorted(glob.glob('/dev/ttyUSB*')); print('UART port:', ports[-1] if ports else 'NONE')"
```

### Test calc_uart (add 42 + 13, expect 55)

```bash
python3 -c "
import serial, glob
port = sorted(glob.glob('/dev/ttyUSB*'))[-1]
print('port:', port)
s = serial.Serial(port, 115200, timeout=2)
s.write(bytes([0, 42, 13]))     # op=add(0), a=42, b=13
r = s.read(2)
print('result:', (r[0]<<8|r[1]) if len(r)==2 else 'TIMEOUT')
s.close()
"
```

Expected: `result: 55`

### Test uart_echo (send bytes, expect same bytes back)

```bash
python3 -c "
import serial, glob
port = sorted(glob.glob('/dev/ttyUSB*'))[-1]
print('port:', port)
s = serial.Serial(port, 115200, timeout=2)
test = b'Hello'
s.write(test)
r = s.read(len(test))
print('echo:', r, '| match:', r == test)
s.close()
"
```

Expected: `echo: b'Hello' | match: True`

### Test aurora_uart (send 'a' command, expect 'K' ACK)

```bash
python3 -c "
import serial, glob, time
port = sorted(glob.glob('/dev/ttyUSB*'))[-1]
print('port:', port)
s = serial.Serial(port, 115200, timeout=1)
s.write(b'a')
time.sleep(0.1)
r = s.read(s.in_waiting or 1)
print('ACK:', repr(r), '- expected b\'K\'')
s.close()
"
```

### Flush stale bytes and test (after reconnect or port reuse)

```bash
python3 -c "
import serial, glob, time
port = sorted(glob.glob('/dev/ttyUSB*'))[-1]
s = serial.Serial(port, 115200, timeout=0.1)
s.reset_input_buffer()   # discard any stale bytes
time.sleep(0.05)
s.timeout = 2
s.write(bytes([0, 42, 13]))
r = s.read(2)
print('result:', (r[0]<<8|r[1]) if len(r)==2 else 'TIMEOUT')
s.close()
"
```

### Continuous monitor (print all bytes received from FPGA)

```bash
python3 -c "
import serial, glob
port = sorted(glob.glob('/dev/ttyUSB*'))[-1]
print('Monitoring', port, '- Ctrl-C to stop')
s = serial.Serial(port, 115200, timeout=0.1)
while True:
    b = s.read(s.in_waiting or 1)
    if b:
        print('RX:', list(b), repr(b))
"
```

---

## Bash UART Diagnostics

### List and identify ttyUSB ports

```bash
# List all ttyUSB devices
ls -la /dev/ttyUSB*

# Identify which is JTAG vs UART:
# - Lower number = JTAG (openFPGALoader uses this)
# - Higher number = UART data port
# If Tang Nano is the only device: ttyUSB0=JTAG, ttyUSB1=UART
# With one extra USB serial device: ttyUSB0=JTAG, ttyUSB1=other, ttyUSB2=UART

# Identify by driver:
ls /sys/bus/usb-serial/drivers/
udevadm info /dev/ttyUSB1 | grep -E "ID_VENDOR|ID_MODEL|ID_SERIAL"
```

### Configure UART port with stty

```bash
# Required before any raw binary read/write
stty -F /dev/ttyUSB1 115200 raw cs8 -cstopb -parenb clocal cread -echo -crtscts

# Verify settings
stty -F /dev/ttyUSB1 -a
```

### Send raw bytes with printf

```bash
# Configure first
stty -F /dev/ttyUSB1 115200 raw cs8 -cstopb -parenb clocal cread -echo -crtscts

# Send calc_uart add(42,13) = [0x00, 0x2a, 0x0d]
printf '\x00\x2a\x0d' > /dev/ttyUSB1 &

# Read 2-byte response with xxd
xxd -l 2 /dev/ttyUSB1
# Expected: 00000000: 0037  (= 55 decimal)
```

### Check USB devices

```bash
# List all USB devices
lsusb

# Check if Tang Nano is connected (look for Bouffalo Lab BL616 or similar)
lsusb | grep -i "bouffalo\|bl616\|sipeed\|gowin"

# Monitor USB events
udevadm monitor --kernel --udev --property
```

### Permission fixes

```bash
# Permanent (takes effect after next login)
sudo usermod -aG dialout $USER

# Verify group membership
groups $USER
```

---

## Podman Troubleshooting

### "Cannot open /dev/bus/usb" in container

```bash
# Check if user can access USB
ls -la /dev/bus/usb/*/*

# Run with explicit USB device path
podman run --rm \
  -v $(pwd):/workspace \
  --privileged \
  ts2v-gowin-oss:latest \
  openFPGALoader -b tangnano20k /workspace/.artifacts/uart_echo/hw.fs
```

### Image not found

```bash
# Rebuild from scratch
bun run toolchain:image:build:podman

# Or pull if a registry is configured
podman pull ts2v-gowin-oss:latest
```

### openFPGALoader can't find device

```bash
# Check device is detected
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --list-cables
podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --detect
```

### Synthesis fails with "module not found"

The compiler must be given the `hw/` subdirectory (not the parent) for examples
that have a `hw/ + client/` split:

```bash
# CORRECT
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/aurora_uart/hw ...

# WRONG - includes client Bun scripts, breaks compilation
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/aurora_uart ...
```

---

## Tang Nano 20K Power-Cycle Reminder

After flashing to **external flash** (`--external-flash --write-flash`):

1. Wait for `openFPGALoader` to complete and print `Done`
2. **Unplug the USB cable**
3. **Replug the USB cable**
4. Wait 1-2 seconds for the FPGA to load from flash
5. Then run the Python test

The GW2AR-18C loads from external flash only on a true power-on.  The JTAG reset
triggered by openFPGALoader's `-r` flag is NOT sufficient.

After flashing to **SRAM** (no flags): no power-cycle needed — the FPGA runs immediately.

---

## Board Pin Reference (Tang Nano 20K)

| Signal    | Pin    | Notes                   |
| --------- | ------ | ----------------------- |
| `clk`     | 4      | 27 MHz oscillator       |
| `rst_n`   | 88     | S1 button, active-HIGH  |
| `btn`     | 87     | S2 button, active-HIGH  |
| `led[0]`  | 15     | Active-LOW              |
| `led[1]`  | 16     | Active-LOW              |
| `led[2]`  | 17     | Active-LOW              |
| `led[3]`  | 18     | Active-LOW              |
| `led[4]`  | 19     | Active-LOW              |
| `led[5]`  | 20     | Active-LOW              |
| `uart_tx` | **69** | FPGA TX → BL616 UART RX |
| `uart_rx` | **70** | BL616 UART TX → FPGA RX |
| `ws2812`  | 79     | WS2812 data line        |

**USB bridge chip:** BL616 (Bouffalo Lab), not FTDI2232H.

**ttyUSB mapping:**
- `/dev/ttyUSB0` — JTAG programming port
- `/dev/ttyUSB1` — UART data port (when no other USB serial device present)
