#!/usr/bin/env bash
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$REPO"

PROGRAM="${1:-examples/cpu/nibble4/programs/counter.n4asm}"

echo "Assembling: $PROGRAM"
bun run examples/cpu/nibble4/tools/assemble.ts "$PROGRAM"

BIN="${PROGRAM%.n4asm}.bin"
echo "Loading: $BIN"
bun run examples/cpu/nibble4/tools/load.ts "$BIN"
