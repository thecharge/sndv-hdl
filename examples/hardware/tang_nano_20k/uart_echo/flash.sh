#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"
cd "$REPO"

bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/uart_echo \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/uart_echo \
  --flash

echo ""
echo "Flash complete."
echo "IMPORTANT: The GW2AR-18C does not always reload from flash after a JTAG reset."
echo "If the FPGA does not respond: unplug and replug the USB cable to power-cycle it."
echo "The chip loads the bitstream from external flash automatically on power-on."
echo ""
echo "Test with:"
echo "  python3 -c \""
echo "    import serial, glob"
echo "    port = sorted(glob.glob('/dev/ttyUSB*'))[-1]"
echo "    print('Using:', port)"
echo "    s = serial.Serial(port, 115200, timeout=2)"
echo "    s.write(b'Hello')"
echo "    r = s.read(5)"
echo "    print('echo:', r)"
echo "    s.close()"
echo "  \""
