# Append-Only Engineering Log

## 2026-03-11T00:00:00Z - Session Start
- Objective accepted: production rewrite to Bun + Turborepo with open-source FPGA flow and full docs/process controls.
- Constraint accepted: required patterns (adapter, command, factory, facade, repository) in delivered code.

## 2026-03-11T00:10:00Z - Baseline Audit
- Observed Node monolith scripts in root `package.json`.
- Observed oversized file: `src/class-compiler/class-module-compiler.ts` at 1296 lines.
- Observed pre-existing ISO document in repo: `docs/1800-2017.pdf`.

## 2026-03-11T00:20:00Z - Environment Validation
- Bun present: `1.3.10`.
- Podman present: `4.9.3`.
- `docker` alias points to Podman.
- Turbo not globally installed (managed via workspace dependency).
- No host-level FPGA synthesis tools found in PATH (`yosys`, `nextpnr-gowin`, `gowin_pack`, `openFPGALoader`).
- `lsusb` output did not expose an obviously identifiable Gowin/JTAG probe string.

## 2026-03-11T00:35:00Z - Architecture Migration
- Converted root to Bun workspace + Turbo tasks.
- Added packages: `types`, `config`, `core`, `process`, `toolchain` and app `cli`.
- Added board/toolchain config source: `configs/workspace.config.json`.

## 2026-03-11T00:50:00Z - Pattern Implementation
- Adapter: `LegacyCompilerAdapter`, `TangNano20kToolchainAdapter`.
- Command: `CompileSourceCommand`, `SynthesizeDesignCommand`, `FlashBitstreamCommand`.
- Factory: `CompilerAdapterFactory`, `TangNano20kToolchainFactory`, `ContainerCommandFactory`.
- Facade: `Ts2vCompilationFacade`, `TangNano20kToolchainFacade`.
- Repository: `FileSystemRepository`, `WorkspaceConfigurationRepository`, `ContainerRuntimeRepository`.

## 2026-03-11T01:05:00Z - QA Gate Stabilization
- Installed workspace dependencies with Bun.
- Resolved TS path alias and tsconfig migration issues.
- Resolved lint and test discovery issues in monorepo.
- Verified passing command: `bun run quality` components (typecheck/lint/test/build) in sequence.

## 2026-03-11T01:15:00Z - Compile Proof
- Ran: `bun run apps/cli/src/index.ts compile examples/blinker.ts --board boards/tang_nano_20k.board.json --out .artifacts/tang20k`.
- Generated artifacts:
  - `.artifacts/tang20k/blinker.sv`
  - `.artifacts/tang20k/tang_nano_20k.cst`
  - `.artifacts/tang20k/sim.f`

## 2026-03-11T01:20:00Z - Synth/Flash Attempt
- Ran compile with `--flash` to trigger synthesis and programming.
- Container pull failed:
  - `ghcr.io/yosyshq/oss-cad-suite:latest` returned HTTP 403 via Podman.
- Additional image probes attempted and failed for unauthenticated pulls:
  - `docker.io/hdlc/oss-cad-suite:latest`
  - `docker.io/yosyshq/oss-cad-suite:latest`
- Result: full hardware flash proof is blocked by container image accessibility in this environment.

## 2026-03-11T01:25:00Z - Documentation Rewrite
- Rewrote README and created governance/process docs for development, style, toolchain, QA, security/compliance, production readiness, and package inventory.
- Added VS Code workspace settings and extension recommendations.
- Added `AGENTS.md` for explicit multi-agent responsibilities.

## 2026-03-11T01:30:00Z - Assumptions and Explicit Gaps
- Assumption: Tang Nano 20K uses Gowin open-source flow via Apicula and nextpnr-himbaechel.
- Gap: container image availability and potentially USB probe access remain unresolved.
- No claim of completed SOC 2 or ISO certification is made.

## 2026-03-11T01:45:00Z - Follow-up Hardware Unblock Attempt
- Verified `ghcr.io/yosyshq/oss-cad-suite:latest` still blocked from this environment (403 Forbidden token response).
- Verified `docker.io/yosyshq/oss-cad-suite:latest` unavailable (access denied).
- Pulled fallback images that are publicly accessible (`docker.io/hdlc/impl:latest`, `docker.io/ghdl/ext:latest`) but confirmed they do not include full Tang Nano 20K command set (`nextpnr-himbaechel`, `gowin_pack`, `openFPGALoader` absent in tested image path).
- Confirmed host package installation path is blocked in-session by sudo password requirement.

## 2026-03-11T01:50:00Z - Toolchain Hardening Changes
- Updated synthesis to parse generated SystemVerilog explicitly with `read_verilog -sv` before `synth_gowin`.
- Added configurable binary names (`yosys`, `nextpnr`, `gowinPack`, `programmer`) in workspace config schema.
- Added configurable USB device passthrough list (`usbDevicePaths`) to support programmer access from containers.
- Updated container command factory to emit `--device` mappings.
- Updated default and checked-in workspace configs to include these new fields.

## 2026-03-11T16:20:00Z - Tang Nano 20K Mapping And Container Command Fixes
- Verified canonical Apicula tuple for Tang Nano 20K from upstream examples:
  - `--device GW2AR-LV18QN88C8/I7`
  - `--vopt family=GW2A-18C`
  - `gowin_pack -d GW2A-18C`
- Updated `TangNano20kToolchainAdapter` to use `board.part` for `--device` and `board.pnrDevice` for family/pack device.
- Found command execution bug: image `ENTRYPOINT ["bash","-lc"]` combined with runtime `bash -lc` caused shell commands not to run as intended.
- Removed image entrypoint and rebuilt image; validated tool versions inside image.

## 2026-03-11T16:30:00Z - Path Translation And Compile/Flash Behavior
- Found container path bug: host absolute paths (`/home/...`) were passed into container runtime where only `/workspace/...` exists.
- Added host-to-container path translation in toolchain adapter for synthesis and flash bitstream paths.
- Re-ran `compile --flash` and reached actual synthesis execution.
- New blocking error from compiler output path:
  - Generated `.artifacts/tang20k/blinker.sv` did not contain top module `blinker`.
  - Synthesis failed with `ERROR: Module 'blinker' not found!`.

## 2026-03-11T16:36:00Z - Manual End-To-End Hardware Attempt
- Ran manual known-good top module flow in container:
  - `yosys` synth succeeded.
  - `nextpnr-himbaechel` place/route succeeded.
  - `gowin_pack` bitstream generation succeeded.
  - Output generated: `.artifacts/manual2/blinker_top.fs`.
- Flash step failed at device access:
  - `openFPGALoader` reported `unable to open ftdi device: -3 (device not found)`.
- Conclusion: toolchain and bitstream generation are functioning; programming is blocked by FTDI probe visibility/permissions in runtime.

## 2026-03-11T16:40:00Z - SDLC Hygiene Additions
- Added root formatting scripts and hook bootstrap:
  - `bun run format`
  - `bun run format:check`
  - `prepare: husky`
- Added executable hook: `.husky/pre-commit` running format check, lint, and tests.
- Added contribution controls:
  - `.github/pull_request_template.md`
  - `.github/ISSUE_TEMPLATE/bug_report.md`
  - `.github/ISSUE_TEMPLATE/feature_request.md`
  - `.github/ISSUE_TEMPLATE/security_report.md`

## 2026-03-11T16:45:00Z - Resource Index Used For Debugging
- Apicula repository and examples:
  - https://github.com/YosysHQ/apicula
  - https://raw.githubusercontent.com/YosysHQ/apicula/master/examples/Makefile
- Lushay Labs setup reference:
  - https://learn.lushaylabs.com/getting-setup-with-the-tang-nano-9k/
- nextpnr project:
  - https://github.com/YosysHQ/nextpnr
- openFPGALoader project:
  - https://github.com/trabucayre/openFPGALoader

## 2026-03-11T16:55:00Z - Compiler Migration Into Monorepo Core
- Removed core compile path dependency on `src/cli.ts` helper exports.
- Added monorepo-native compiler engine in `packages/core/src/compiler/compiler-engine.ts`.
- Migrated compiler internals into core package namespace under:
  - `packages/core/src/compiler/class-compiler/*`
  - `packages/core/src/compiler/lexer/*`
  - `packages/core/src/compiler/parser/*`
  - `packages/core/src/compiler/typechecker/*`
  - `packages/core/src/compiler/codegen/*`
  - `packages/core/src/compiler/constants/*`
  - `packages/core/src/compiler/errors/*`
- Updated `LegacyCompilerAdapter` to use monorepo-local compiler engine for build/constraints.

## 2026-03-11T17:00:00Z - End-To-End Flow Stabilization Updates
- Updated `compile:example` script to target hardware class example:
  - `examples/hardware/tang_nano_20k_blinker.ts`
- Added top-module resolution in CLI compile handler by parsing generated SV module declaration.
- Fixed toolchain adapter pathing to separate source file basename from synthesized top module name.
- Updated class compiler assertion emission to avoid unsupported `assert ... else` syntax in yosys parse path.

## 2026-03-11T17:05:00Z - Validation Results After Migration
- `bun run quality` passes end-to-end (typecheck/lint/test/build).
- `bun run compile:example` generates artifacts from migrated compiler path.
- `compile --flash` for `examples/hardware/tang_nano_20k_blinker.ts` now completes:
  - yosys synthesis: success
  - nextpnr place/route: success
  - gowin_pack: success
  - bitstream generated: `.artifacts/tang20k/tang_nano_20k_blinker.fs`
- Final step still blocked in environment:
  - `openFPGALoader` fails with `unable to open ftdi device: -3 (device not found)`.
- Conclusion: compiler migration and toolchain build path are now functioning; hardware programming remains blocked by host runtime USB/JTAG visibility.

## 2026-03-11T17:20:00Z - Legacy Compiler Tree Removal
- Migrated remaining legacy compiler support modules from root `src/*` into core package namespace:
  - `packages/core/src/compiler/config/*`
  - `packages/core/src/compiler/constraints/*`
  - `packages/core/src/compiler/lint/*`
  - `packages/core/src/compiler/pipeline/*`
- Updated root tests to import canonical compiler paths under `packages/core/src/compiler/*`.
- Removed deprecated root compiler sources:
  - `src/class-compiler`, `src/codegen`, `src/config`, `src/constants`, `src/constraints`, `src/errors`, `src/lexer`, `src/parser`, `src/pipeline`, `src/typechecker`, `src/lint`, `src/cli.ts`.
- Kept `src/runtime/*` and `src/types/node.d.ts` for runtime compatibility in existing hardware examples.

## 2026-03-11T17:25:00Z - Tang Nano 20K Probe Diagnostics (S2 Workflow Session)
- Host USB inventory command:
  - `lsusb`
- Container probe scan command:
  - `podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb`
- Result in this session:
  - `openFPGALoader --scan-usb` returned empty probe table.
  - Flash attempt with explicit board profile still failed:
    - `openFPGALoader -b tangnano20k .artifacts/tang20k/tang_nano_20k_blinker.fs`
    - Error: `unable to open ftdi device: -3 (device not found)`.
- Added dedicated runbook for repeatable board mode/probe/flash workflow:
  - `docs/guides/tang_nano_20k_programming.md`.

## 2026-03-11T18:10:00Z - Cleanup + Fresh Example + Full Validation Re-run
- Removed generated build/cache outputs to ensure clean state before proof run:
  - `.artifacts`, `build`, `cpu/build`, `.turbo`
  - package/app `dist` and package/app `.turbo` folders
- Re-verified root `src` no longer contains legacy compiler trees:
  - only `src/runtime` and `src/types` remain.
- Added fresh hardware example:
  - `examples/hardware/usb_jtag_probe_blinker.ts`.
- Validation commands executed:
  - `CI=1 bun run quality` (pass)
  - `bun run apps/cli/src/index.ts compile examples/hardware/usb_jtag_probe_blinker.ts --board boards/tang_nano_20k.board.json --out .artifacts/usbjtag` (artifacts generated)
  - `bun run apps/cli/src/index.ts compile examples/hardware/usb_jtag_probe_blinker.ts --board boards/tang_nano_20k.board.json --out .artifacts/usbjtag --flash` (synth + nextpnr + gowin_pack success, programming failed)
- Programming failure signature remained:
  - `unable to open ftdi device: -3 (device not found)`
  - `JTAG init failed with: unable to open ftdi device`
- Probe enumeration checks in same session:
  - `lsusb` did not show a recognized openFPGALoader probe profile for CH552/CMSIS-DAP/FTDI.
  - `podman run --rm --device /dev/bus/usb ts2v-gowin-oss:latest openFPGALoader --scan-usb` returned empty.
  - forced cable attempts (`-c cmsisdap`, `-c ch552_jtag` with override VID/PID) did not detect/open a usable device.

## 2026-03-11T18:25:00Z - Programmer Profile Automation + Permission Documentation
- Implemented configurable programmer profile support in monorepo toolchain path:
  - Types: `packages/types/src/config.ts`
  - Schema validation: `packages/config/src/schemas/workspace-configuration-schema.ts`
  - Toolchain flash adapter: `packages/toolchain/src/adapters/tang-nano-20k-toolchain-adapter.ts`
  - Configured board profiles: `configs/workspace.config.json`
- Flash flow now attempts:
  1. board autodetect
  2. each configured profile (`cable`/`vid`/`pid` and optional advanced flags)
- Added explicit operational documentation:
  - `docs/guides/programmer-profiles-and-usb-permissions.md`
  - updated `docs/hardware-toolchain.md` and `README.md` docs index.
- Validation after implementation:
  - `CI=1 bun run quality` passed.
  - `compile --flash` with new profile automation executed and logged:
    - profile `board-autodetect`: scan empty, `unable to open ftdi device: -3`
    - profile `usi-cmsisdap` (`10ab:9309`): `JTAG init failed with: No device found`
    - profile `goodix-cmsisdap-candidate` (`27c6:6594`): `JTAG init failed with: No device found`
  - Result: synthesis/pack path is still healthy; programming remains blocked by probe visibility/driver/protocol mismatch in current host/container context.

## 2026-03-11T18:35:00Z - User-Facing USB Debugger Onboarding Runbook
- Added verbose operator documentation with explicit copy-paste commands for:
  - lsusb unplug/replug delta detection
  - host udev/permission setup for VID:PID access
  - container probe visibility checks
  - compile+flash retry workflow with automated programmer profile attempts
- New document:
  - `docs/guides/user-usb-debugger-onboarding.md`
- Cross-linked from:
  - `README.md`
  - `docs/hardware-toolchain.md`
  - `docs/guides/programmer-profiles-and-usb-permissions.md`

## 2026-03-11T18:45:00Z - FTDI 0403:6010 Confirmation And Automated Profile Retry
- Host `lsusb` confirmed FTDI debugger candidate:
  - `0403:6010 Future Technology Devices International, Ltd FT2232C/D/H`
- Container scan and detect currently fail with access denial for this VID:PID:
  - `Error: can't open device with vid:vid = 0x0403:0x6010. Error code -3 Access denied (insufficient permissions)`
- Added explicit automated profile for this candidate:
  - profile name: `ftdi-ch552-jtag`
  - cable: `ch552_jtag`
  - vid/pid: `0x0403` / `0x6010`
  - config path: `configs/workspace.config.json`
- Re-ran compile+flash and verified profile retry log includes `ftdi-ch552-jtag` attempt.
- Added corresponding user documentation updates in:
  - `docs/guides/user-usb-debugger-onboarding.md`
  - `docs/guides/programmer-profiles-and-usb-permissions.md`

## 2026-03-11T19:00:00Z - Documentation/Attribution Polish Requested By User
- Expanded user onboarding runbook with explicit rationale for udev commands:
  - why `MODE`, `GROUP`, and `TAG+="uaccess"` are required
  - why `udevadm --reload-rules` and `udevadm trigger` are required
- Added MIT licensing artifacts:
  - `LICENSE`
  - README license section
- Added author attribution artifacts:
  - `AUTHORS.md` with `Radoslav Sandov`
  - README author section
- Expanded `AGENTS.md` with ownership boundaries, debugging rules, release readiness rules, and legal attribution section.
- Repository transport status at this point:
  - no git remote configured (`git remote -v` empty)
  - cannot push/replace remote branches until remote URL and credentials are configured.

## 2026-03-11T19:20:00Z - Real Hardware Flash Success (Blinker + WS2812 Demo)
- USB probe visibility recovered in container:
  - `openFPGALoader --scan-usb` reported `0x0403:0x6010 FTDI2232 SIPEED USB Debugger`.
- Tang Nano 20K blinker end-to-end flash succeeded:
  - command: `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_blinker.ts --board boards/tang_nano_20k.board.json --out .artifacts/tang20k --flash`
  - programming output contained `DONE` and `Load SRAM ... 100.00%`.
- Added board-targeted WS2812 demo source:
  - `examples/hardware/tang_nano_20k_ws2812b.ts`
- WS2812 demo end-to-end flash succeeded:
  - command: `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_ws2812b.ts --board boards/tang_nano_20k.board.json --out .artifacts/ws2812 --flash`
  - programming output contained `DONE` and `Load SRAM ... 100.00%`.

## 2026-03-11T19:30:00Z - Remote Branch Replacement Completed
- Configured git author to requested attribution:
  - `user.name=Radoslav Sandov`
- Created commit:
  - `3c76e80` `Complete monorepo migration, USB programmer profiling, and production docs`
- Force-updated remote main branch as requested:
  - `git push origin master:main --force`
  - remote update: `ee2e873...3c76e80 master -> main (forced update)`

## 2026-03-11T20:10:00Z - Flash Persistence + Example Reliability Corrections
- Replaced oversized Tang Nano blinker implementation with a minimal bring-up example:
  - `examples/hardware/tang_nano_20k_blinker.ts`
- Corrected active-low LED assumptions across hardware debug examples:
  - `examples/hardware/usb_jtag_probe_blinker.ts`
  - `examples/hardware/tang_nano_20k_reset_debug.ts`
  - `examples/hardware/tang_nano_20k_uart_debug.ts`
  - `examples/hardware/tang_nano_20k_ws2812b.ts`
- Changed flash command path from ambiguous short-form to explicit persistent mode:
  - `openFPGALoader --write-flash --verify -b tangnano20k <bitstream.fs>`
  - code path: `packages/toolchain/src/adapters/tang-nano-20k-toolchain-adapter.ts`
- Added tests for this behavior:
  - `packages/core/src/facades/hardware-examples-compile.test.ts`
  - `packages/toolchain/src/adapters/tang-nano-20k-toolchain-adapter.test.ts`

## 2026-03-11T20:15:00Z - Validation Evidence (Quality + Compile/Flash)
- Full quality gate passed:
  - command: `TURBO_UI=false bun run quality`
  - result: typecheck, lint, test, build all successful.
- New targeted tests passed:
  - `bun test packages/core/src/facades/hardware-examples-compile.test.ts`
  - `bun test packages/toolchain/src/adapters/tang-nano-20k-toolchain-adapter.test.ts`
- Tang Nano 20K compile+flash succeeded with explicit flash write/verify:
  - command: `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_blinker.ts --board boards/tang_nano_20k.board.json --out .artifacts/tang20k --flash`
  - filtered output evidence:
    - `[profile=board-autodetect] ... openFPGALoader --write-flash --verify -b tangnano20k ...`
    - `write to flash`
    - `Detected: Winbond W25Q64`
    - `Verifying write (May take time)`
    - `DONE`

## 2026-03-11T21:00:00Z - Compiler Limit Lift + WS2812 Reflash Validation
- Lifted class-compiler width caps to production-friendly behavior:
  - removed stale numeric cap constants in `packages/core/src/compiler/constants/defaults.ts`
  - class parser now accepts arbitrary positive widths via `UintN`/`UIntN`
  - `Logic<N>` width parsing remains generic and now enforces positive integers only (no max cap)
- Lifted parser usability restriction:
  - `if/else` in class modules now supports single-statement branches without braces
- Added runtime type aliases for wide buses:
  - `Uint<N>` and `UInt<N>` exported from `@ts2v/runtime`
- Added/updated tests:
  - `tests/class-compiler.test.ts`
    - `supports UintN and UIntN widths above 64 bits`
    - `parses single-statement if/else without braces`
  - `packages/core/src/facades/hardware-examples-compile.test.ts`
    - now includes `examples/hardware/tang_nano_20k_ws2812b.ts`
- WS2812 example compile blocker resolved:
  - fixed non-braced `if/else` chain in `examples/hardware/tang_nano_20k_ws2812b.ts`
- Quality validation passed after changes:
  - `TURBO_UI=false bun run quality`
  - all typecheck/lint/test/build tasks successful
- Real WS2812 compile+flash execution (Tang Nano 20K) completed with write/verify evidence:
  - command: `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_ws2812b.ts --board boards/tang_nano_20k.board.json --out .artifacts/ws2812 --flash`
  - observed lines:
    - `[profile=board-autodetect] ... openFPGALoader --write-flash --verify -b tangnano20k ...`
    - `write to flash`
    - `Done`
    - `DONE`
    - `Verifying write (May take time)`

## 2026-03-11T21:20:00Z - Power-Cycle Persistence Remediation (External Flash Explicit)
- User reported: after power cycle, programmed design was not observable.
- Verified probe visibility still healthy:
  - `openFPGALoader --scan-usb` showed `0x0403:0x6010 FTDI2232 SIPEED USB Debugger`.
- Ran explicit external-flash write/verify/reset against known-visible blinker image:
  - command: `openFPGALoader --external-flash --write-flash --verify -r -b tangnano20k .artifacts/tang20k/tang_nano_20k_blinker.fs`
  - evidence lines:
    - `write to flash`
    - `Detected: Winbond W25Q64`
    - `Verifying write (May take time)`
    - `DONE`
- Production hardening applied:
  - toolchain adapter now always includes `--external-flash` for Tang Nano 20K flash path.
  - updated test coverage in `packages/toolchain/src/adapters/tang-nano-20k-toolchain-adapter.test.ts`.
  - updated docs in:
    - `docs/development.md`
    - `docs/guides/tang_nano_20k_programming.md`
    - `docs/guides/examples-matrix.md`

## 2026-03-11T22:10:00Z - Production Documentation Overhaul
- User request: end-to-end practical docs with clear board-definition authoring, debugging, quickstart, and reduced ambiguity.
- Added new documentation:
  - `docs/quickstart.md` (zero-to-blinky and zero-to-WS2812 path)
  - `docs/guides/board-definition-authoring.md` (required fields, naming rules, bring-up checklist)
  - `docs/guides/debugging-and-troubleshooting.md` (layered failure isolation runbook)
- Rewrote and hardened existing docs:
  - `README.md` (from-zero quickstart, production docs index, blinky + WS2812 flow)
  - `docs/development.md`
  - `docs/hardware-toolchain.md`
  - `docs/guides/tang_nano_20k_programming.md`
  - `docs/production-readiness.md`
  - `docs/guides/examples-matrix.md`
- Documentation cleanup:
  - removed obsolete fragmented docs:
    - `docs/readme-chunks/`
    - `docs/readme-parts/`
  - removed legacy board guides to reduce conflicting guidance:
    - `docs/tang_nano_20k_guide.md`
    - `docs/tang_nano_9k_guide.md`
- Added Mermaid diagrams in new/rewritten docs for flow clarity.

## 2026-03-11T22:45:00Z - Refresh Pass Validation (Blinky/WS2812 + CPU Mermaid)
- Refreshed hardware examples for practical visibility:
  - `examples/hardware/tang_nano_20k_blinker.ts` updated to deterministic phase cycling.
  - `examples/hardware/tang_nano_20k_ws2812b.ts` updated to timing-controlled serial driver with heartbeat LED.
- Resolved parser subset regression in refreshed WS2812 example:
  - removed unsupported ternary operator (`? :`) and replaced with explicit `if/else` logic.
- Added behavior checks for refreshed examples:
  - `packages/core/src/facades/hardware-examples-behavior.test.ts`
  - assertions aligned with emitted SV literals (`1'b1`/`1'b0`).
- Converted CPU architecture docs away from ASCII-only diagrams:
  - `cpu/README_ASSEMBLY.md` now includes Mermaid architecture and instruction-flow diagrams.
- Added production gate checklist/runbook:
  - `docs/guides/production-reality-check.md`
- Validation commands completed successfully:
  - `bun test packages/core/src/facades/hardware-examples-compile.test.ts`
  - `bun test packages/core/src/facades/hardware-examples-behavior.test.ts`
  - `bun test packages/toolchain/src/adapters/tang-nano-20k-toolchain-adapter.test.ts`
- Real WS2812 compile + flash proof (Tang Nano 20K) succeeded with persistent external flash flags:
  - command: `TS2V_ALLOW_LOCAL_TOOLCHAIN=1 bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_ws2812b.ts --board boards/tang_nano_20k.board.json --out .artifacts/tang20k --flash`
  - observed lines:
    - `[profile=board-autodetect] ... openFPGALoader --external-flash --write-flash --verify -b tangnano20k ...`
    - `write to flash`
    - `DONE`
    - `Verifying write (May take time)`

## 2026-03-11T22:55:00Z - Full Production Gate Re-check
- Initial `bun run quality` run failed due lint findings in newly added behavior test (`noNonNullAssertion` + formatting).
- Applied fix in `packages/core/src/facades/hardware-examples-behavior.test.ts`:
  - replaced non-null assertion with explicit guard.
  - aligned formatting to Biome output.
- Re-ran full gate successfully:
  - `TURBO_UI=false bun run quality`
  - typecheck, lint, test, and build all completed successfully.

## 2026-03-11T23:10:00Z - Tang Nano 20K WS2812 Pin Mapping Correction + Board Docs Rewrite
- User requested schematic-backed correction for onboard WS2812 mapping (`PIN79_WS2812`).
- Updated board mapping to pin 79:
  - `boards/tang_nano_20k.board.json` (`ws2812.pin` from `73` -> `79`)
  - `constraints/tang_nano_20k.cst` (`IO_LOC "ws2812" 79`)
- Added explicit source comment in hardware example:
  - `examples/hardware/tang_nano_20k_ws2812b.ts` now notes mapping comes from board JSON and expected schematic net is `PIN79_WS2812`.
- Reworked board-definition documentation for clarity and practical use:
  - `docs/guides/board-definition-authoring.md` rewritten with schematic-to-JSON workflow, Tang Nano 20K mapping table, naming rules, and validation steps.
- Updated operational docs to remove ambiguity around WS2812 wiring:
  - `README.md`
  - `docs/quickstart.md`
  - `docs/guides/tang_nano_20k_programming.md`
  - `docs/guides/debugging-and-troubleshooting.md`
- Validation:
  - `bun test packages/core/src/facades/hardware-examples-compile.test.ts` passed.
  - Recompiled WS2812 example and verified generated constraints include:
    - `IO_LOC "ws2812" 79;`

## 2026-03-11T23:25:00Z - Real Flash Proof Refresh + Production Scenarios + Dependabot
- Executed fresh real hardware flash runs in this session:
  - WS2812 demo:
    - `TS2V_ALLOW_LOCAL_TOOLCHAIN=1 bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_ws2812b.ts --board boards/tang_nano_20k.board.json --out .artifacts/ws2812-e2e --flash`
  - Blinky demo:
    - `TS2V_ALLOW_LOCAL_TOOLCHAIN=1 bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_blinker.ts --board boards/tang_nano_20k.board.json --out .artifacts/blinky-e2e --flash`
- Observed WS2812 proof lines:
  - probe visible: `0x0403:0x6010 FTDI2232 SIPEED`
  - programmer command includes `openFPGALoader --external-flash --write-flash --verify -b tangnano20k`
  - `write to flash`
  - `DONE`
  - `Detected: Winbond W25Q64 128 sectors size: 64Mb`
  - `Verifying write (May take time)`
  - final `Done`
- Observed blinky proof lines:
  - same persistent flash flags present,
  - `write to flash`, `DONE`, `Detected: Winbond W25Q64`, `Verifying write (May take time)`, final `Done`.
- Documentation improvements requested by user:
  - `docs/quickstart.md` rewritten to a short WS2812-first end-to-end flow with explicit wiring and pass/fail checks.
  - `docs/guides/production-reality-check.md` expanded with concrete production scenarios (bring-up, feature demo delivery, release candidate gate).
- Added automated dependency update config:
  - `.github/dependabot.yml` covering root workspace, `apps/cli`, and all `packages/*` manifests.

## 2026-03-11T23:40:00Z - Post-Restart No-Behavior Debug And Fix
- User reported: after restart and after reflash, no visible behavior.
- Applied flash-path hardening for immediate reload after programming:
  - `packages/toolchain/src/adapters/tang-nano-20k-toolchain-adapter.ts`
  - flash command now includes `-r` together with `--external-flash --write-flash --verify`.
- Added regression assertion:
  - `packages/toolchain/src/adapters/tang-nano-20k-toolchain-adapter.test.ts`
  - verifies `-r` is present in emitted programmer command.
- Increased WS2812 demo color intensity for clear visibility in ambient light:
  - `examples/hardware/tang_nano_20k_ws2812b.ts`
  - color frames moved from low-intensity values to high-intensity values.
- Revalidated with real flash run:
  - `TS2V_ALLOW_LOCAL_TOOLCHAIN=1 bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k_ws2812b.ts --board boards/tang_nano_20k.board.json --out .artifacts/ws2812-visible --flash`
  - observed lines include:
    - `openFPGALoader --external-flash --write-flash --verify -r -b tangnano20k ...`
    - probe row `0x0403:0x6010 FTDI2232 SIPEED`
    - `write to flash`
    - `DONE`
    - `Verifying write (May take time)`
    - final `Done`

## 2026-03-11T23:55:00Z - Board Property Definitions + WS2812 Protocol Clarifications
- User reported confusion about schematic naming (`IOT27B/GCLKC_0` Bank 0) versus board JSON pin mapping and property semantics (`std`, `drive`, `pull`).
- Updated `docs/guides/board-definition-authoring.md` with:
  - explicit pin naming domains and mapping rule:
    - package pin number is used in board JSON (`pin: "79"`),
    - schematic alias examples (`IOT27B/GCLKC_0`, bank info) are descriptive labels for the same IO site.
  - full property reference for `pin`, `std`, `drive`, `pull`, and `freq`.
- Added new guide:
  - `docs/guides/ws2812-protocol-and-brightness.md`
  - clarifies that WS2812 has no separate brightness command channel; brightness is encoded in GRB channel values.
  - includes practical 3.3V->5V level-shifter guidance for strips that do not accept 3.3V logic reliably.
- Updated user-facing docs:
  - `docs/quickstart.md` now includes level-shifter warning and direct link to WS2812 protocol guide.
  - `docs/guides/debugging-and-troubleshooting.md` now includes level-threshold troubleshooting and WS2812 protocol reference link.
- Validation:
  - `TURBO_UI=false bun run quality` passed.

## 2026-03-12T00:10:00Z - No-Blink Incident Isolation With Clockless LED Probe
- User reported persistent "flashed but nothing blinks" behavior.
- Added dedicated board-definition property reference:
  - `docs/guides/board-definition-properties-reference.md`
  - includes full `std`/`drive`/`pull` semantics and vendor mapping output.
- Added clockless hardware probe example to isolate clock-path issues:
  - `examples/hardware/tang_nano_20k_sys_led_button_probe.ts`
  - behavior: button released -> all SYS LEDs off, button pressed -> all SYS LEDs on.
- Compile mapping check confirms expected pins:
  - `btn` -> `87`
  - `led[0]` -> `15`
  - `led[5]` -> `20`
- Flash run evidence:
  - programmer command includes `openFPGALoader --external-flash --write-flash --verify -r -b tangnano20k`
  - probe row includes `0x0403:0x6010 FTDI2232 SIPEED`
  - `write to flash`, `DONE`, `Verifying write (May take time)`, final `Done`.
