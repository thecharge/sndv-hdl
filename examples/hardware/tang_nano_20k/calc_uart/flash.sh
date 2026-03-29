#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"
cd "$REPO"
exec bun run apps/cli/src/index.ts compile \
  examples/hardware/tang_nano_20k/calc_uart/hw \
  --board boards/tang_nano_20k.board.json \
  --out .artifacts/calc_uart \
  --flash
