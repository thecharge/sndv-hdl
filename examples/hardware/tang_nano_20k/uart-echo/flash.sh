#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"
cd "$REPO"

bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/uart-echo \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/uart_echo_stdlib \
  --flash

echo ""
echo "Flash complete. Unplug and replug USB to power-cycle the board."
echo "Test: python3 -c \"import serial; s=serial.Serial(sorted(__import__('glob').glob('/dev/ttyUSB*'))[-1],115200,timeout=2); s.write(b'Hi'); print('echo:', s.read(2))\""
