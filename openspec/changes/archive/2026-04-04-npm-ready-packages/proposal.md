## Why

All three publishable packages (`@ts2v/runtime`, `@ts2v/types`, `@ts2v/cli`) are marked `private: true` with no `exports` fields, no `files` manifest, and no `publishConfig`. Users cannot install them from npm - they must clone the repository. Making these packages npm-ready removes the single largest barrier to adoption.

## What Changes

- Remove `private: true` from `packages/runtime`, `packages/types`, and `apps/cli`
- Add dual ESM + CJS `exports` field to each publishable package
- Add `files` field to each (`["dist", "README.md", "LICENSE"]`)
- Add `publishConfig: { "access": "public" }` to each
- Verify `bun run build` produces correct `dist/` for each package
- Add per-package `README.md` files explaining installation and usage
- Update root `README.md` to lead with `npm install @ts2v/runtime` instead of "clone the repo"
- Add `release` and `publish` scripts to root `package.json`
- Update `docs/guides/getting-started.md` to show npm install path

## Non-goals

- No proprietary EDA tools - the CLI still requires the OSS toolchain container (Yosys/nextpnr/gowin_pack/openFPGALoader).
- No changes to the compiler core, codegen, or hardware runtime semantics.
- No new board support.
- No changes to existing hardware examples.

## OSS Toolchain Impact

None. npm publish only affects the TypeScript packages. The synthesis toolchain remains containerised and open-source-only.

## Capabilities

### New Capabilities

- `npm-package-runtime`: `@ts2v/runtime` is installable from npm with proper `exports`, `files`, and `publishConfig`
- `npm-package-types`: `@ts2v/types` is installable from npm with proper `exports`, `files`, and `publishConfig`
- `npm-package-cli`: `@ts2v/cli` is installable from npm as a global or dev dependency with proper `bin`, `exports`, `files`, and `publishConfig`

### Modified Capabilities

- `ts-developer-experience`: Getting-started documentation now leads with `npm install` instead of repository clone instructions

## Impact

- **packages/runtime/package.json**: remove `private`, add `exports`, `files`, `publishConfig`
- **packages/types/package.json**: remove `private`, add `exports`, `files`, `publishConfig`
- **apps/cli/package.json**: remove `private`, add `exports`, `files`, `publishConfig`
- **packages/runtime/README.md**: new file
- **packages/types/README.md**: new file
- **apps/cli/README.md**: new file
- **README.md**: update getting-started section to lead with npm install
- **docs/guides/getting-started.md**: add npm install path before clone path
- **package.json** (root): add `release` and `publish` scripts

Agent ownership: Build Agent (package.json changes), Documentation Agent (README and docs updates).
Delivery gates that apply: `bun run quality` must pass.
