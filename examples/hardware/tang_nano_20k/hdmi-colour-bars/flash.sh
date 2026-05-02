#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"
cd "$REPO"

bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/hdmi-colour-bars \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/hdmi_colour_bars \
  --flash

echo ""
echo "Flash complete. Unplug and replug USB to power-cycle the board."
