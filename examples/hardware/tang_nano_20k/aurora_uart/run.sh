#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"
PORT="${1:-/dev/ttyUSB1}"
exec bun "$REPO/examples/hardware/tang_nano_20k/aurora_uart/client/aurora.ts" "$PORT"
