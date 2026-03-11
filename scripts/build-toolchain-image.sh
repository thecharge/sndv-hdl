#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
image_name="${TS2V_TOOLCHAIN_IMAGE:-ts2v-gowin-oss:latest}"

if [[ -n "${TS2V_CONTAINER_RUNTIME:-}" ]]; then
  runtime="${TS2V_CONTAINER_RUNTIME}"
else
  if command -v podman >/dev/null 2>&1; then
    runtime="podman"
  elif command -v docker >/dev/null 2>&1; then
    runtime="docker"
  else
    echo "No container runtime found. Install podman or docker." >&2
    exit 1
  fi
fi

"${runtime}" build \
  --file "${repo_root}/toolchain/Dockerfile" \
  --tag "${image_name}" \
  "${repo_root}"

echo "Built ${image_name} using ${runtime}."
