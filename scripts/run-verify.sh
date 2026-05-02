#!/usr/bin/env bash
# Formal verification runner: invoke SymbiYosys inside the ts2v toolchain container.
# Usage: bun run verify <path/to/design.sby>
# Exits 0 on PASS, 1 on FAIL or missing argument.

set -euo pipefail

SBY_FILE="${1:-}"
if [[ -z "$SBY_FILE" ]]; then
    echo "Usage: bun run verify <path/to/design.sby>" >&2
    exit 1
fi

if [[ ! -f "$SBY_FILE" ]]; then
    echo "Error: .sby file not found: $SBY_FILE" >&2
    exit 1
fi

SBY_DIR="$(cd "$(dirname "$SBY_FILE")" && pwd)"
SBY_NAME="$(basename "$SBY_FILE")"
SBY_BASE="${SBY_NAME%.sby}"

RUNTIME="${TS2V_CONTAINER_RUNTIME:-$(command -v podman 2>/dev/null && echo podman || echo docker)}"
IMAGE="ts2v-gowin-oss:latest"

echo "[verify] Running SymbiYosys on ${SBY_NAME} (bmc depth 20)"
echo "[verify] Container: ${RUNTIME} / ${IMAGE}"

set +e
"$RUNTIME" run --rm \
    -v "${SBY_DIR}:/work" \
    -w /work \
    "$IMAGE" \
    bash -c "sby -f ${SBY_NAME} 2>&1"
RESULT=$?
set -e

if [[ $RESULT -eq 0 ]]; then
    echo "[verify] PASS: ${SBY_BASE} — all properties hold at depth 20"
    exit 0
else
    echo "[verify] FAIL: ${SBY_BASE} — one or more properties violated (exit ${RESULT})"
    exit 1
fi
