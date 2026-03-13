# UVM-Style Simulation With Podman

This guide runs a simple class-based UVM-style smoke testbench without relying on host simulator installs.

## Scope
- DUT sources:
	- `examples/alu.ts`
	- `examples/hardware/tang_nano_20k_blinker.ts`
- Generated artifacts:
	- `.artifacts/uvm/alu.sv`
	- `.artifacts/uvm/tang_nano_20k_blinker.sv`
- Typed specs:
	- `testbenches/uvm/alu.uvm-spec.ts`
	- `testbenches/uvm/blinky.uvm-spec.ts`
- Generated testbenches:
	- `.artifacts/uvm/tb_alu_uvm.sv`
	- `.artifacts/uvm/tb_blinky_uvm.sv`
- UVM-lite support: `testbenches/uvm/uvm_lite_pkg.sv` and `testbenches/uvm/uvm_lite_macros.svh`

## Prerequisites
- Bun 1.3+
- Podman (preferred) or Docker
- Toolchain image built:

```bash
bun run toolchain:image:build:podman
```

## Run The UVM-Style Smoke Test

```bash
bun run test:uvm
```

The script performs:
1. `bun` compile of ALU and Blinky DUTs into `.artifacts/uvm/*.sv`.
2. TypeScript-driven testbench generation from both suite specs.
3. Containerized `iverilog` compile with SystemVerilog (`-g2012`) for each suite.
4. `vvp` simulation run and pass/fail summary output for each suite.
5. Report generation:
	- `.artifacts/uvm/reports/uvm-alu-report.json`
	- `.artifacts/uvm/reports/uvm-alu-report.md`
	- `.artifacts/uvm/reports/uvm-blinky-report.json`
	- `.artifacts/uvm/reports/uvm-blinky-report.md`

## Expected Pass Signature
Look for these lines:
- `Starting simple UVM-style ALU smoke test`
- repeated `checked ...` messages
- `alu uvm-lite testbench: <N> passed, 0 failed`
- `UVM-style simulation completed successfully.`

## Notes
- This is intentionally UVM-lite to keep it portable in open-source simulators.
- If image name differs, set `TS2V_TOOLCHAIN_IMAGE` when running `bun run test:uvm`.
