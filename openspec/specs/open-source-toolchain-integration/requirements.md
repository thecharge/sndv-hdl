# Requirements — open-source-toolchain-integration

Requirements for the synthesis, place-and-route, bitstream pack, and flash pipeline.
Keyed REQ-TOOL-NNN.

---

## Open-Source-Only Policy

REQ-TOOL-001: The toolchain SHALL use exclusively open-source tools for all synthesis,
place-and-route, bitstream packing, and programming operations.

REQ-TOOL-002: Vivado, Quartus, proprietary Gowin EDA pack, or any other closed-source
EDA tool SHALL NOT be required, referenced, or invoked at any stage.

REQ-TOOL-003: Every board supported in the synthesis flow SHALL have a complete, verified
OSS path: Yosys synthesis -> nextpnr place-and-route -> bitstream pack -> openFPGALoader.

---

## Container Runtime

REQ-TOOL-010: All synthesis, place-and-route, pack, and simulation steps SHALL run inside
the `ts2v-gowin-oss` container image.

REQ-TOOL-011: The container runtime SHALL support both Podman (preferred) and Docker as
fallback. The toolchain adapter SHALL detect which is available.

REQ-TOOL-012: The container image SHALL be buildable from `toolchain/Dockerfile` using:
`bun run toolchain:image:build`

REQ-TOOL-013: No host installation of Yosys, nextpnr, gowin_pack, iverilog, or
openFPGALoader SHALL be required for synthesis or simulation.

---

## Synthesis Pipeline (Gowin boards)

REQ-TOOL-020: For Gowin boards (Tang Nano 20K, Tang Nano 9K), the synthesis flow SHALL be:
1. `yosys synth_gowin` -> JSON netlist
2. `nextpnr-himbaechel` (with Gowin arch) -> placed JSON
3. `gowin_pack` -> `.fs` bitstream

REQ-TOOL-021: The synthesis adapter SHALL pass the `.sv` source and `.cst` constraint file
to Yosys and Nextpnr respectively.

REQ-TOOL-022: The toolchain SHALL fail with a non-zero exit code and a diagnostic message
if synthesis, PnR, or pack fails.

---

## Flash / Programming

REQ-TOOL-030: The flash stage SHALL use `openFPGALoader --external-flash --write-flash
--verify` to write bitstreams to external SPI flash (persistent across power cycles).

REQ-TOOL-031: The toolchain SHALL try programmer profiles in order from
`configs/workspace.config.json`, falling back from autodetect to explicit cable/VID/PID.

REQ-TOOL-032: After flash completes, the toolchain SHALL display the openFPGALoader output
including the `Writing` and `Verifying` progress lines.

REQ-TOOL-033: The user SHALL be reminded to power-cycle the board after flash (GW2AR-18C
does not reliably reload from `-r` reset; requires USB unplug/replug).

---

## Simulation (UVM-style)

REQ-TOOL-040: The toolchain SHALL support running `iverilog` + `vvp` inside the container
for UVM-style simulation.

REQ-TOOL-041: Simulation SHALL produce per-suite JSON and Markdown reports in
`.artifacts/uvm/reports/`.

REQ-TOOL-042: Simulation runners SHALL exit with non-zero status when any suite fails.

---

## USB and Probe Management

REQ-TOOL-050: The toolchain SHALL NOT require `sudo` for flash operations when the user
is a member of the `dialout` group (or equivalent USB permission group).

REQ-TOOL-051: The toolchain SHALL support probe scanning via `openFPGALoader --scan-usb`
inside the container to verify USB passthrough before flash.

REQ-TOOL-052: The toolchain documentation SHALL distinguish between JTAG port (lower
ttyUSBN number) and UART data port (higher number) for the Tang Nano 20K.
