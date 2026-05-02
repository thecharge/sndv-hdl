#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$REPO"

bun run apps/cli/src/index.ts compile \
  examples/cpu/nibble4 \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/nibble4 \
  --flash

echo ""
echo "Flash complete. Unplug and replug USB to power-cycle the board."
echo "Then load a program: ./examples/cpu/nibble4/load.sh"
