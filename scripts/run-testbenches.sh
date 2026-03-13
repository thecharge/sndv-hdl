#!/bin/bash
# Run all Verilog testbenches against generated modules.
# Requires: iverilog (Icarus Verilog) in PATH
# Usage: bash scripts/run-testbenches.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

BUILD_DIR="build"
TB_DIR="examples"
SIM_DIR="build/sim"

mkdir -p "$SIM_DIR"

# Step 1: Compile TypeScript examples to Verilog
echo "=== Compiling TypeScript examples ==="
node --require ./node_modules/ts-node/register scripts/build-all.ts

# Step 2: Check iverilog is available
if ! command -v iverilog &> /dev/null; then
    echo ""
    echo "iverilog not found. Install Icarus Verilog to run hardware testbenches:"
    echo "  Ubuntu/Debian: sudo apt install iverilog"
    echo "  macOS:         brew install icarus-verilog"
    echo "  Windows:       https://bleyer.org/icarus/"
    echo ""
    echo "Testbench files are in $TB_DIR/ - run manually when iverilog is available."
    exit 0
fi

echo ""
echo "=== Running Verilog testbenches ==="
echo ""

PASS=0
FAIL=0

run_tb() {
    local name=$1
    local verilog=$2
    local testbench=$3

    echo -n "  $name... "
    if iverilog -g2012 -o "$SIM_DIR/tb_${name}" "$verilog" "$testbench" 2>/dev/null; then
        output=$(vvp "$SIM_DIR/tb_${name}" 2>&1)
        if echo "$output" | grep -q "FAIL"; then
            echo -e "${RED}FAIL${NC}"
            echo "$output" | grep "FAIL"
            FAIL=$((FAIL + 1))
        else
            passed=$(echo "$output" | grep "passed" | head -1)
            echo -e "${GREEN}OK${NC} ($passed)"
            PASS=$((PASS + 1))
        fi
    else
        echo -e "${RED}COMPILE ERROR${NC}"
        FAIL=$((FAIL + 1))
    fi
}

run_tb "blinker"  "$BUILD_DIR/blinker.v"  "$TB_DIR/blinker/tb_blinker.sv"
run_tb "uart_tx"  "$BUILD_DIR/uart_tx.v"  "$TB_DIR/uart_tx/tb_uart_tx.sv"
run_tb "alu"      "$BUILD_DIR/alu.v"      "$TB_DIR/alu/tb_alu.sv"
run_tb "pwm"      "$BUILD_DIR/pwm.v"      "$TB_DIR/pwm/tb_pwm.sv"
run_tb "stdlib"   "$BUILD_DIR/stdlib.v"   "$TB_DIR/stdlib/tb_stdlib.sv"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ $FAIL -gt 0 ]; then
    exit 1
fi
