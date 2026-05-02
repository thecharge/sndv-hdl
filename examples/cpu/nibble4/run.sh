#!/usr/bin/env bash
set -euo pipefail
# Monitor nibble4 UART output. Each byte received = one nibble value (0x00..0x0F).
# Press Ctrl+C to stop.

PORT="${1:-}"
if [ -z "$PORT" ]; then
    # Auto-detect: UART data port is the highest-numbered ttyUSB.
    PORT=$(ls /dev/ttyUSB* 2>/dev/null | sort | tail -1)
    if [ -z "$PORT" ]; then
        echo "No /dev/ttyUSB* found." >&2; exit 1
    fi
fi
echo "Monitoring UART output on $PORT (Ctrl+C to stop)"
stty -F "$PORT" 115200 raw cs8 -cstopb -parenb clocal cread -echo -crtscts
python3 -c "
import sys, termios, tty, serial, time
port = sys.argv[1]
s = serial.Serial(port, 115200, timeout=1)
print('Waiting for data...', flush=True)
try:
    while True:
        b = s.read(1)
        if b:
            print(f'0x{b[0]:02X} ({b[0] & 0xF})', flush=True)
except KeyboardInterrupt:
    pass
s.close()
" "$PORT"
