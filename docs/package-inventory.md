# Package and Tool Inventory

## Workspace Packages
- `@ts2v/cli`: CLI entrypoints and command handlers.
- `@ts2v/types`: shared interfaces and contracts.
- `@ts2v/config`: workspace and board configuration repository/service.
- `@ts2v/core`: compile facade and compiler adapter.
- `@ts2v/process`: process runner and runtime detection.
- `@ts2v/toolchain`: synthesis/flash adapters and factory.

## JavaScript Tooling
- Bun `1.3.10`
- Turbo `2.8.16`
- TypeScript `5.9.3`
- Biome `1.9.4`

## Open-Source FPGA Tools (Target)
- Yosys
- nextpnr-himbaechel
- gowin_pack (from Apicula)
- openFPGALoader

## Container and Runtime
- Podman `4.9.3`
- Docker compatibility via alias to Podman on this host

## Configuration Locations
- Root workspace scripts: `package.json`
- Task graph: `turbo.json`
- Shared TS config: `tsconfig.json`
- Board/toolchain config: `configs/workspace.config.json`
