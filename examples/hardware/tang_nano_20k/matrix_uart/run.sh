#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"
exec bun "$REPO/examples/hardware/tang_nano_20k/matrix_uart/client/matrix.ts" "${1:-auto}"
