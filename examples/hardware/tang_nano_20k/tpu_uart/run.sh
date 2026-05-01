#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../" && pwd)"

if [ -n "${1:-}" ]; then
    PORT="$1"
else
    shopt -s nullglob
    PORTS=(/dev/ttyUSB*)
    shopt -u nullglob
    if [ ${#PORTS[@]} -eq 0 ]; then
        echo "ERROR: no /dev/ttyUSB* devices found" >&2
        echo "  Check USB cable and board power." >&2
        exit 1
    fi
    mapfile -t SORTED_PORTS < <(printf '%s\n' "${PORTS[@]}" | sort -V)
    if [ ${#SORTED_PORTS[@]} -ne 2 ]; then
        echo "ERROR: refusing to auto-select a UART port from ${#SORTED_PORTS[@]} ttyUSB devices." >&2
        echo "  Pass the intended UART device explicitly, for example:" >&2
        echo "  ./examples/hardware/tang_nano_20k/tpu_uart/run.sh /dev/ttyUSB1" >&2
        printf '  Available ports:\n' >&2
        printf '    %s\n' "${SORTED_PORTS[@]}" >&2
        exit 1
    fi
    PORT="${SORTED_PORTS[1]}"
    echo "Auto-detected port: $PORT" >&2
fi

exec bun "$REPO/examples/hardware/tang_nano_20k/tpu_uart/client/tpu.ts" "$PORT"
