# UART and Serial Port Debugging Guide

This guide covers everything needed to get reliable UART communication working between
a Tang Nano 20K FPGA and a host PC: how to find the right port, how to test the hardware
independently of any client code, and how to debug when things do not work.

---

## Hardware Reference

The Tang Nano 20K ships with a Sipeed USB debugger board that contains an FTDI2232H chip.
The FTDI2232H provides two independent USB-to-serial interfaces on a single USB connector:

| Interface | Linux device | Purpose |
|-----------|-------------|---------|
| 0 | `/dev/ttyUSB0` | JTAG (programming only) |
| 1 | `/dev/ttyUSB1` | UART data (for calc_uart, aurora_uart) |

**If another USB serial device is connected to the PC**, Linux assigns device numbers in
enumeration order.  The FPGA UART may appear as `/dev/ttyUSB2` or higher instead of
`/dev/ttyUSB1`.

Always check which ports are present before connecting:

```bash
ls /dev/ttyUSB*
# Typical output with only Tang Nano:   ttyUSB0  ttyUSB1
# With one extra USB serial device:     ttyUSB0  ttyUSB1  ttyUSB2
#   (the Tang Nano UART will be ttyUSB2 in this case)
```

The JTAG port (`ttyUSB0`) is always the lower-numbered of the two Tang Nano ports.
The UART port (`ttyUSB1` or `ttyUSBN`) is always the higher-numbered one.

---

## UART Settings

All examples in this repo use 115200 8N1:

| Parameter | Value |
|-----------|-------|
| Baud rate | 115200 |
| Data bits | 8 |
| Parity | None |
| Stop bits | 1 |
| Flow control | None |
| FPGA TX pin | 15 (`uart_tx`) |
| FPGA RX pin | 16 (`uart_rx`) |

---

## Port Permissions

The dialout group owns `/dev/ttyUSB*`.  One-shot permission fix:

```bash
sudo chmod a+rw /dev/ttyUSB1   # adjust number as needed
```

Permanent fix (takes effect after next login):

```bash
sudo usermod -aG dialout $USER
```

Reference: [docs/guides/user-usb-debugger-onboarding.md](user-usb-debugger-onboarding.md)

---

## Verifying the FPGA Responds (Python One-Liner)

Before debugging client code, confirm the FPGA hardware actually responds.
Python's pyserial library handles all termios configuration correctly and is
the most reliable way to do a raw hardware test.

**Test calc_uart (add 42 + 13, expect result 55):**

```bash
python3 -c "
import serial
s = serial.Serial('/dev/ttyUSB1', 115200, timeout=2)
s.write(bytes([0, 42, 13]))   # op=add(0), a=42, b=13
r = s.read(2)
print('result:', (r[0]<<8|r[1]) if len(r)==2 else 'TIMEOUT - FPGA not responding')
s.close()
"
```

Expected output: `result: 55`

If pyserial is not installed:

```bash
pip install pyserial
```

**Test aurora_uart (send 'a' command, expect 'K' ACK):**

```bash
python3 -c "
import serial, time
s = serial.Serial('/dev/ttyUSB1', 115200, timeout=1)
s.write(b'a')
time.sleep(0.1)
r = s.read(s.in_waiting or 1)
print('ACK:', repr(r), '- expected b\"K\"')
s.close()
"
```

Expected output: `ACK: b'K' - expected b'K'`

---

## Manual Testing with Command-Line Tools

### picocom

```bash
sudo apt-get install picocom    # install if needed
picocom -b 115200 /dev/ttyUSB1
# Ctrl-A Ctrl-X to exit
```

This opens an interactive terminal.  For binary protocols like calc_uart you need to send
raw bytes, which picocom does not do easily.  Use socat or Python for binary protocols.

### socat (raw binary test)

Send raw bytes and receive the response:

```bash
# Configure port first
stty -F /dev/ttyUSB1 115200 raw cs8 -cstopb -parenb clocal cread -echo -crtscts

# Open bidirectional connection with socat
socat - /dev/ttyUSB1,b115200,raw,echo=0
```

Press `Ctrl-C` to exit socat.

For scripted binary testing (sends the three bytes for add 42+13):

```bash
stty -F /dev/ttyUSB1 115200 raw cs8 -cstopb -parenb clocal cread -echo -crtscts
printf '\x00\x2a\x0d' > /dev/ttyUSB1 &
xxd -l 2 /dev/ttyUSB1
```

Expected xxd output: `00000000: 0037`  (= 55 decimal)

### minicom

```bash
sudo apt-get install minicom
minicom --device /dev/ttyUSB1 --baudrate 115200
# Ctrl-A Z for menu, Ctrl-A X to exit
# Disable hardware flow control: Ctrl-A O -> Serial port setup -> F
```

---

## Configuring a Serial Port on Linux with stty

For reference — this is what the calc.ts and aurora.ts clients do:

```bash
# Basic 115200 8N1 raw configuration
stty -F /dev/ttyUSB1 115200 raw cs8 -cstopb -parenb clocal cread -echo -crtscts

# Verify current settings
stty -F /dev/ttyUSB1 -a
```

Key flags:

| Flag | Meaning |
|------|---------|
| `115200` | baud rate |
| `raw` | disable all processing (canonical mode, echo, signals) |
| `cs8` | 8 data bits |
| `-cstopb` | 1 stop bit (not 2) |
| `-parenb` | no parity |
| `clocal` | ignore modem status (CD), required for USB serial |
| `cread` | enable receiver |
| `-echo` | disable echo |
| `-crtscts` | disable hardware flow control (RTS/CTS) |

Reference: [Linux Serial Ports Using C/C++](https://blog.mbedded.ninja/programming/operating-systems/linux/linux-serial-ports-using-c-cpp/)

---

## Opening a Serial Port Correctly in Bun / Node.js

Bun's `serialport` npm package crashes with `uv_default_loop not supported`.  Use raw
`fs` module calls instead.

Critical details for correct operation:

1. **Open first, then configure.**  Many USB serial drivers (including FTDI) reinitialize
   the UART when the device is opened.  If you run `stty` before `openSync`, the FTDI
   hardware resets to defaults (9600 baud) on your `openSync` call.

2. **Use `O_NOCTTY`.**  Prevents the port from becoming the controlling terminal of your
   process.  pyserial always sets this flag.  Value: `0o400` on Linux.

3. **Use `O_NONBLOCK`.**  Prevents `openSync` blocking on carrier detect.  Value: `0o4000`.

4. **For reading:** Bun's `readSync` on an `O_NONBLOCK` tty fd returns `0` when no data
   is available (rather than throwing `EAGAIN`).  Use `Bun.sleepSync(ms)` between retries
   to avoid busy-spinning.

```typescript
import { openSync, writeSync, readSync, closeSync, constants } from "fs";
import { spawnSync } from "child_process";

const O_NOCTTY = 0o400;
const O_NONBLOCK = 0o4000;
const BAUD = 115_200;

// 1. Open first
const fd = openSync("/dev/ttyUSB1", constants.O_RDWR | O_NOCTTY | O_NONBLOCK);

// 2. Configure while fd is held open
spawnSync("stty", [
  "-F", "/dev/ttyUSB1", `${BAUD}`, "raw", "cs8",
  "-cstopb", "-parenb", "clocal", "cread", "-echo", "-crtscts",
]);

// 3. Write
writeSync(fd, Buffer.from([0x00, 42, 13]));

// 4. Read with polling (sleepSync avoids busy loop)
function readExact(fd: number, n: number, timeoutMs = 2000): Buffer | null {
  const buf = Buffer.alloc(n);
  let got = 0;
  const dead = Date.now() + timeoutMs;
  while (got < n) {
    if (Date.now() > dead) return null;
    const k = readSync(fd, buf, got, n - got, null);
    if (k > 0) { got += k; continue; }
    Bun.sleepSync(10);
  }
  return buf;
}
```

Known Bun issues:
- [node-serialport crashes in Bun (issue #4622)](https://github.com/oven-sh/bun/issues/4622)
- [Unable to use serialport in Bun (issue #5625)](https://github.com/oven-sh/bun/issues/5625)

For maximum reliability, use Python's pyserial for the serial I/O layer
(see `examples/hardware/tang_nano_20k/aurora_uart/client/aurora.py` for a complete example).

---

## Tang Nano 20K Board Resources

| Resource | Link |
|----------|------|
| Official Sipeed wiki | https://wiki.sipeed.com/hardware/en/tang/tang-nano-20k/nano-20k.html |
| Official hardware examples (UART, SDRAM, etc.) | https://github.com/sipeed/TangNano-20K-example |
| Tang Nano 9K UART debugging walkthrough (same FTDI setup) | https://learn.lushaylabs.com/tang-nano-9k-debugging/ |
| FTDI2232H datasheet (USB bridge chip) | https://ftdichip.com/products/ft2232h/ |
| ArchWiki serial console guide | https://wiki.archlinux.org/title/Working_with_the_serial_console |

---

## Troubleshooting Checklist

**Timeout / no response from FPGA:**

1. Run `ls /dev/ttyUSB*` to confirm which port is the UART (see Hardware Reference above).
2. Confirm the board was flashed with the correct example.  Re-run `flash.sh` and watch
   for errors in the synthesis/flash output.
3. Run the Python one-liner above to confirm the FPGA responds independently of client code.
4. Make sure you are on the UART port, not the JTAG port (ttyUSBN, not ttyUSBN-1).
5. Wait 1-2 seconds after power-on before running the client - the FPGA takes a moment
   to load the design from flash.

**`cannot open /dev/ttyUSBN: ENOENT`:**

The port does not exist.  Check USB cable, board power, and `lsusb` output.

**`cannot open /dev/ttyUSBN: EACCES` / `Permission denied`:**

```bash
sudo chmod a+rw /dev/ttyUSBN
```

**`stty: invalid argument 'vmin'`:**

The `vmin`/`vtime` keywords vary by platform.  Try `min N time N` instead.
Alternatively, use O_NONBLOCK reads with `Bun.sleepSync` polling (see above).

**FPGA responds to Python but not to Bun client:**

The Bun client may be opening the port before configuring it, causing the FTDI driver to
reset the baud rate.  Make sure you call `openSync` before `spawnSync("stty", ...)`.
See the code example in the section above.

---

## Examples Using UART in This Repo

| Example | Description | Client |
|---------|-------------|--------|
| `examples/hardware/tang_nano_20k/aurora_uart/` | WS2812 rainbow with live colour control | TypeScript (Bun), Python |
| `examples/hardware/tang_nano_20k/calc_uart/` | FPGA arithmetic calculator (JSON protocol) | TypeScript (Bun) |

See the README in each example folder for full usage instructions.
