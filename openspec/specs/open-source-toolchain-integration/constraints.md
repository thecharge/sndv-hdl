# Constraints — open-source-toolchain-integration

---

## Hard OSS Boundary

No closed-source EDA tool may ever be added to the toolchain, even as an optional path.
This is a founding principle of the project. Any proposal that requires Vivado, Quartus,
or proprietary Gowin EDA pack bits SHALL be rejected immediately.

If a partially-supported board (like Arty A7) needs synthesis, the correct path is:
1. Wait for a fully self-contained OSS synthesis solution for that FPGA family
2. Document the gap in `docs/hardware-toolchain.md` and this spec
3. Open a proposal (`add-xilinx-arty-a7-full-support`) only when the OSS path is viable

---

## Board Gating for Synthesis Flow

A board's synthesis flow MUST NOT be added to `configs/workspace.config.json` or
`packages/types/SupportedBoardId` until:
- At least one real-board flash is confirmed and logged
- The flash output is documented in `docs/append-only-engineering-log.md`
- The programmer profile (cable, VID, PID) is recorded in `configs/workspace.config.json`

---

## Container Image Stability

- The `ts2v-gowin-oss` image tag used in CI and development MUST be pinned by content hash
  or explicit version, not just `latest`, for reproducibility.
- Changing the Dockerfile requires `bun run toolchain:image:build` and a new test flash.

---

## Power-Cycle Requirement (GW2AR-18C)

The GW2AR-18C FPGA (Tang Nano 20K) does NOT reliably reload from external flash after
a JTAG reset (`-r` flag). After any flash operation:
1. Unplug the USB cable
2. Replug after 3+ seconds
3. The bitstream loads automatically from external SPI flash on power-on

This constraint MUST be documented in every flash-related guide and in `flash.sh` scripts.

---

## Programmer Profile Fallback Order

The toolchain SHALL try profiles in this order for Tang Nano 20K:
1. Autodetect (no explicit cable/VID/PID)
2. `sipeed-ft2232-debugger` (cable: ft2232, VID: 0x0403, PID: 0x6010) — confirmed working
3. Additional profiles as documented in `configs/workspace.config.json`

---

## Synthesis Tool Compatibility Matrix

| Tool | Status | Notes |
|---|---|---|
| Yosys + nextpnr-himbaechel (Gowin) | Fully supported | Production path |
| Icarus Verilog (iverilog) | Fully supported | Simulation only |
| Verilator | Fully supported | Lint/simulation |
| Yosys + nextpnr-xilinx | Experimental — not in scope | Needs xraydb from Vivado |
| Any commercial tool | Out of scope | OSS-only policy |
