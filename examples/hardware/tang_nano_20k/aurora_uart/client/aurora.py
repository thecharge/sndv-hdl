#!/usr/bin/env python3
"""
aurora.py - Aurora UART control client for Tang Nano 20K.

Connects to the FTDI2232H UART bridge on /dev/ttyUSB1 (interface 1 of the
Sipeed debugger) at 115200 8N1 and sends single-byte commands to the FPGA.

Requirements:
    pip install pyserial

Usage:
    python3 aurora.py [/dev/ttyUSB1]

    If the port is not accessible:
        sudo chmod a+rw /dev/ttyUSB1
    or permanently:
        sudo usermod -aG dialout $USER && logout

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

PORT = sys.argv[1] if len(sys.argv) > 1 else "/dev/ttyUSB1"
BAUD = 115200
VALID_CMDS = set("argbfsx")


def open_port(port: str) -> serial.Serial:
    try:
        ser = serial.Serial(port, BAUD, timeout=0.1)
        return ser
    except serial.SerialException as e:
        print(f"ERROR: cannot open {port}: {e}")
        print(f"  Try: sudo chmod a+rw {port}")
        print(f"  Or:  sudo usermod -aG dialout $USER  (then log out and in)")
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
