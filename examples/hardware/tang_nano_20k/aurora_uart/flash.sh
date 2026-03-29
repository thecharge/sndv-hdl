#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"
cd "$REPO"

bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/aurora_uart/hw \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/aurora_uart \
  --flash

echo ""
echo "Flash complete."
echo "IMPORTANT: The GW2AR-18C does not always reload from flash after a JTAG reset."
echo "If the FPGA does not respond: unplug and replug the USB cable to power-cycle it."
echo "The chip loads the bitstream from external flash automatically on power-on."
