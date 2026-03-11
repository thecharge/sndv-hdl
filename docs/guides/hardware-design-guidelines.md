# Hardware Design Guidelines

## Purpose
This guide defines baseline RTL and board-integration conventions for ts2v-generated and hand-authored designs.

## Top Module Rules
- The synthesized top module name must match the synthesis entrypoint argument.
- Top ports must align exactly with board constraints (`.cst`/`.xdc`).
- Do not emit helper-only modules without an explicit top wrapper.

## Reset and Clock Rules
- Prefer one primary clock domain per top-level example.
- Use explicit reset polarity and document it in board config and constraints.
- Avoid gated clocks unless required by device primitives.

## Constraint Rules
- No duplicate pin assignments across logical ports.
- Keep board pin maps in a single source of truth (`boards/*.board.json`).
- Generated constraints must be checked for collisions before synthesis.

## Toolchain Rules
- For Tang Nano 20K flow use:
  - `nextpnr-himbaechel --device GW2AR-LV18QN88C8/I7 --vopt family=GW2A-18C`
  - `gowin_pack -d GW2A-18C`
- Container path inputs must be relative to `/workspace` when run in container.

## Verification Rules
- Run compile-only and compile+flash paths independently.
- Keep manual fallback scripts for known-good RTL to isolate compiler vs toolchain defects.
- Store reproducible command lines and outputs in append-only engineering log.
