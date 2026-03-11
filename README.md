# ts2v Production Workspace

Production-oriented TypeScript-to-SystemVerilog toolchain with Bun, Turborepo, and open-source FPGA flow adapters.

Author: Radoslav Sandov

## Current Status
- Bun/Turbo monorepo migration is complete.
- Quality gates pass: typecheck, lint, test, build.
- End-to-end compile path works: TypeScript -> SystemVerilog + constraints + manifest.
- Toolchain uses a repository-owned container image build (`toolchain/Dockerfile`) with Podman/Docker fallback.

## Quickstart
```bash
bun install
bun run toolchain:image:build
bun run quality
bun run compile:example
```

## Repository Layout
- `apps/cli`: Bun CLI entrypoint and argument handling.
- `packages/types`: canonical shared types.
- `packages/config`: workspace and board configuration services.
- `packages/core`: compiler facade, command, adapter, repository.
- `packages/runtime`: decorators and runtime signal types for hardware modules.
- `packages/process`: process runner and runtime detection.
- `packages/toolchain`: synthesis/programming adapters and container command factory.
- `configs/workspace.config.json`: board and toolchain defaults.
- `toolchain/Dockerfile`: custom OSS Gowin toolchain image source.

## Commands
- `bun run quality`: typecheck + lint + test + build.
- `bun run format`: apply Biome formatting.
- `bun run format:check`: verify formatting without writing changes.
- `bun run toolchain:image:build`: build local toolchain image for synth/flash.
- `bun run compile:example`: compiles `examples/blinker.ts` to artifacts.
- `bun run flash:tang20k <bitstream.fs>`: programs Tang Nano 20K (requires toolchain/runtime access).

## End-to-End Flow
1. Write hardware logic in TypeScript.
2. Run unit tests with Bun.
3. Compile to SystemVerilog and board constraints.
4. Synthesize and route with open-source tools (Yosys + nextpnr-himbaechel + gowin_pack).
5. Program board with openFPGALoader.

## Documentation Index
- `docs/development.md`
- `docs/guides/examples-matrix.md`
- `docs/guides/programmer-profiles-and-usb-permissions.md`
- `docs/guides/user-usb-debugger-onboarding.md`
- `docs/style-guide.md`
- `docs/hardware-toolchain.md`
- `docs/guides/hardware-design-guidelines.md`
- `docs/guides/sdlc-workflow.md`
- `docs/guides/tang_nano_20k_programming.md`
- `docs/qa-testing.md`
- `docs/security-compliance.md`
- `docs/production-readiness.md`
- `docs/package-inventory.md`
- `docs/append-only-engineering-log.md`

## Upstream References
- Bun docs: https://bun.sh/docs
- Turborepo docs: https://turborepo.com/docs
- Yosys: https://yosyshq.net/yosys/
- nextpnr: https://github.com/YosysHQ/nextpnr
- Apicula (Gowin): https://github.com/YosysHQ/apicula
- openFPGALoader: https://github.com/trabucayre/openFPGALoader
- Tang Nano setup reference: https://learn.lushaylabs.com/getting-setup-with-the-tang-nano-9k/
- Podman docs: https://podman.io/docs
- Docker docs: https://docs.docker.com/
- Biome: https://biomejs.dev

## License
This project is licensed under the MIT License.
See `LICENSE`.

## Authors
See `AUTHORS.md`.
