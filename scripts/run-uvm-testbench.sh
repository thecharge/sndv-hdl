#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
image_name="${TS2V_TOOLCHAIN_IMAGE:-localhost/ts2v-gowin-oss:latest}"

coverage=false
for arg in "$@"; do
  if [[ "${arg}" == "--coverage" ]]; then
    coverage=true
  fi
done

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

volume_suffix=""
if [[ "${runtime}" == "podman" ]]; then
  volume_suffix=":Z"
fi

if ! "${runtime}" image exists "${image_name}"; then
  fallback_image="ts2v-gowin-oss:latest"
  if "${runtime}" image exists "${fallback_image}"; then
    image_name="${fallback_image}"
  else
    echo "Toolchain image not found (${image_name}). Build it first:" >&2
    echo "  bun run toolchain:image:build:podman" >&2
    exit 1
  fi
fi

echo "=== Compile ALU source to SystemVerilog ==="
cd "${repo_root}"
bun run apps/cli/src/index.ts compile examples/alu/alu.ts --board boards/tang_nano_9k.board.json --out .artifacts/uvm

echo "=== Generate ALU UVM-style testbench from TypeScript spec ==="
bun run scripts/generate-uvm-alu-testbench.ts

alu_log_path=".artifacts/uvm/uvm-alu-sim.log"

echo "=== Run simple UVM-style ALU testbench in container (${runtime}) ==="
"${runtime}" run --rm \
  -v "${repo_root}:/workspace${volume_suffix}" \
  -w /workspace \
  "${image_name}" \
  sh -lc "iverilog -g2012 -s tb_alu_uvm -I testbenches/uvm -o .artifacts/uvm/tb_alu_uvm.out .artifacts/uvm/alu.sv testbenches/uvm/uvm_lite_pkg.sv .artifacts/uvm/tb_alu_uvm.sv && vvp .artifacts/uvm/tb_alu_uvm.out" \
  | tee "${alu_log_path}"

echo "=== Generate ALU machine-readable simulation report ==="
bun run scripts/generate-uvm-report.ts "${alu_log_path}" "alu"

echo "=== Compile Blinky source to SystemVerilog ==="
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/blinker/blinker.ts --board boards/tang_nano_20k.board.json --out .artifacts/uvm

echo "=== Generate Blinky UVM-style testbench from TypeScript spec ==="
bun run scripts/generate-uvm-blinky-testbench.ts

blinky_log_path=".artifacts/uvm/uvm-blinky-sim.log"

echo "=== Run simple UVM-style Blinky testbench in container (${runtime}) ==="
"${runtime}" run --rm \
  -v "${repo_root}:/workspace${volume_suffix}" \
  -w /workspace \
  "${image_name}" \
  sh -lc "iverilog -g2012 -s tb_blinky_uvm -I testbenches/uvm -o .artifacts/uvm/tb_blinky_uvm.out .artifacts/uvm/blinker.sv testbenches/uvm/uvm_lite_pkg.sv .artifacts/uvm/tb_blinky_uvm.sv && vvp .artifacts/uvm/tb_blinky_uvm.out" \
  | tee "${blinky_log_path}"

echo "=== Generate Blinky machine-readable simulation report ==="
bun run scripts/generate-uvm-report.ts "${blinky_log_path}" "blinky"

if [[ "${coverage}" == "true" ]]; then
  echo "=== Generating TypeScript coverage report ==="
  mkdir -p "${repo_root}/.artifacts/coverage"
  bunx c8 --reporter=lcov --report-dir="${repo_root}/.artifacts/coverage" \
    --include="packages/*/src/**/*.ts" \
    --exclude="**/*.test.ts" \
    --output-file="${repo_root}/.artifacts/coverage/uvm-lcov.info" \
    bun run scripts/generate-uvm-alu-testbench.ts 2>/dev/null || true
  echo "[artifact] coverage: ${repo_root}/.artifacts/coverage/uvm-lcov.info"
fi

echo "UVM-style simulation suites completed successfully."
