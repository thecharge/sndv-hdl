# ts2v Gowin OSS Toolchain Container

This image is the canonical open-source toolchain for Tang Nano boards in this repo.

It intentionally does not depend on abandoned `hdl.github.io/containers` images and it does not use non-existent YosysHQ registry images.

## What It Includes
- `yosys` (from OSS CAD Suite)
- `nextpnr-himbaechel` (from OSS CAD Suite)
- `gowin_pack` (from OSS CAD Suite / Apicula)
- `openFPGALoader` (built from source)

## Build
```bash
./scripts/build-toolchain-image.sh
```

Optional overrides:
```bash
TS2V_CONTAINER_RUNTIME=docker TS2V_TOOLCHAIN_IMAGE=ts2v-gowin-oss:latest ./scripts/build-toolchain-image.sh
```

## Runtime
The repo runtime order is configured in `configs/workspace.config.json`:
- First: `podman`
- Fallback: `docker`

The default image tag is `ts2v-gowin-oss:latest`.

## Validate tools
```bash
podman run --rm ts2v-gowin-oss:latest "yosys -V && nextpnr-himbaechel --version && openFPGALoader --version"
```
