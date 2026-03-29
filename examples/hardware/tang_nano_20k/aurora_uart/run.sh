#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"

if [ -n "${1:-}" ]; then
    PORT="$1"
else
    # Auto-detect: Tang Nano UART is always the highest-numbered ttyUSB port.
    # (JTAG is the lower port; if another USB serial device is present the
    # numbering shifts, e.g. ttyUSB0+ttyUSB2 instead of ttyUSB0+ttyUSB1.)
    PORT="$(ls /dev/ttyUSB* 2>/dev/null | sort -V | tail -1)"
    if [ -z "$PORT" ]; then
        echo "ERROR: no /dev/ttyUSB* devices found" >&2
        echo "  Check USB cable and board power." >&2
        exit 1
    fi
    echo "Auto-detected port: $PORT" >&2
fi

sudo chmod a+rw "$PORT" 2>/dev/null || true
exec bun "$REPO/examples/hardware/tang_nano_20k/aurora_uart/client/aurora.ts" "$PORT"
