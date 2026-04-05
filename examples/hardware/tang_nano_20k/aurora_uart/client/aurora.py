#!/usr/bin/env python3
"""
aurora.py - Aurora UART control client for Tang Nano 20K.

Connects to the BL616 UART bridge on /dev/ttyUSB1 (or auto-detected when the
expected two-port Tang Nano bridge is the only ttyUSB device pair present) at
115200 8N1 and sends single-byte commands to the FPGA.

Requirements:
    pip install pyserial

Usage:
    python3 aurora.py [/dev/ttyUSB1]

Commands:
    a - aurora mode: smooth rainbow wave (default)
    r - red solid
    g - green solid
    b - blue solid
    f - faster (8x speed, same as holding S2 button)
    s - slower (back to 1x speed)
    x - freeze (hold current colours)
    q - quit

ACK: the FPGA echoes 'K' after each recognised command.
"""

import sys
import time

try:
    import serial
except ImportError:
    print("ERROR: pyserial not installed.  Run: pip install pyserial")
    sys.exit(1)

def _auto_detect_port() -> str:
    """Return the higher of the two Tang Nano ttyUSB ports when unambiguous."""
    import glob as _glob
    ports = sorted(_glob.glob("/dev/ttyUSB*"), key=lambda port: int(port.removeprefix("/dev/ttyUSB")))
    if not ports:
        print("ERROR: no /dev/ttyUSB* found — check USB cable and board power.")
        sys.exit(1)
    if len(ports) != 2:
        print(f"ERROR: refusing to auto-select a UART port from {len(ports)} ttyUSB devices.")
        print("  Pass the intended UART device explicitly, for example: python3 aurora.py /dev/ttyUSB1")
        print("  Available ports:")
        for port in ports:
            print(f"    {port}")
        sys.exit(1)
    return ports[1]

PORT = sys.argv[1] if len(sys.argv) > 1 else _auto_detect_port()
BAUD = 115200
VALID_CMDS = set("argbfsx")


def open_port(port: str) -> serial.Serial:
    try:
        ser = serial.Serial(port, BAUD, timeout=0.1)
        return ser
    except serial.SerialException as e:
        print(f"ERROR: cannot open {port}: {e}")
        print("  Check group access for the device.")
        print("  Prefer: sudo usermod -aG dialout $USER  (then log out and back in)")
        sys.exit(1)


def send_cmd(ser: serial.Serial, cmd: str) -> None:
    ser.write(bytes([ord(cmd)]))
    ser.flush()
    time.sleep(0.05)
    waiting = ser.in_waiting
    if waiting:
        ack = ser.read(waiting)
        ack_text = ack.decode("ascii", errors="replace").strip()
        print(f"  ACK: {ack_text!r}  ({ack.hex()})")
    else:
        print("  (no ACK received — check FPGA is running and /dev/ttyUSB1 is connected)")


def main() -> None:
    ser = open_port(PORT)
    print(f"Connected to {PORT} at {BAUD} baud.")
    print("Commands: a=aurora  r=red  g=green  b=blue  f=faster  s=slower  x=freeze  q=quit")
    print()

    while True:
        try:
            raw = input("> ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not raw:
            continue

        cmd = raw[0]
        if cmd == "q":
            break
        if cmd in VALID_CMDS:
            send_cmd(ser, cmd)
        else:
            print(f"  Unknown command '{cmd}'.  Valid: a r g b f s x q")

    ser.close()
    print("Disconnected.")


if __name__ == "__main__":
    main()
