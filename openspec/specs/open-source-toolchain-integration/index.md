# open-source-toolchain-integration

**Owner:** Toolchain Agent
**Status:** Production (Gowin boards), Experimental (Xilinx — constraint-gen only)
**Version:** Bootstrap 1.0

## Summary

The synthesis, place-and-route, bitstream pack, and flash pipeline that converts
compiled SystemVerilog into a bitstream and programs it to a physical FPGA board.

The entire flow runs inside the `ts2v-gowin-oss` container image (built from
`toolchain/Dockerfile`). Container runtime: Podman (preferred) with Docker fallback.
No host installation of any EDA tool is required.

**Gowin board flow (production):**
```
.sv + .cst  ->  yosys synth_gowin  ->  JSON netlist
            ->  nextpnr-himbaechel  ->  placed JSON
            ->  gowin_pack          ->  .fs bitstream
            ->  openFPGALoader --external-flash --write-flash --verify
```

## Files

- `requirements.md` - SHALL statements for the toolchain integration
- `constraints.md` - OSS-only policy, container requirements, board gating rules
- `scenarios/synthesis-and-flash.md` - Acceptance scenarios for full synthesis-to-flash flow

## Key Source Locations

| Path | Responsibility |
|---|---|
| `packages/toolchain/src/adapters/` | Synthesis and flash adapters |
| `packages/toolchain/src/commands/` | Yosys, nextpnr, gowin_pack, openFPGALoader commands |
| `packages/toolchain/src/facades/` | Toolchain facade |
| `packages/toolchain/src/factories/` | Command factories |
| `packages/toolchain/src/repositories/` | Container image management |
| `toolchain/Dockerfile` | Container image definition |
| `configs/workspace.config.json` | Programmer profiles and board config |

## Related Capabilities

- `board-configuration-and-support` - provides board definitions and constraint files
- `cli-and-workflow-orchestration` - orchestrates the full compile-to-flash command
