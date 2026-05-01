#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"
cd "$REPO"

bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/matrix_uart/hw \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/matrix_uart \
  --flash

echo ""
echo "Flash complete."
echo "IMPORTANT: Unplug and replug the USB cable to power-cycle the GW2AR-18C."
echo "The chip loads the bitstream from external flash automatically on power-on."
