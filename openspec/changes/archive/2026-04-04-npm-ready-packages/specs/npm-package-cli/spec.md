## ADDED Requirements

### Requirement: Package is publishable to npm registry

`@ts2v/cli` must be installable via `npm install -g @ts2v/cli` or `bun add @ts2v/cli`.

#### Scenario: Package has no `private` flag

- **WHEN** `apps/cli/package.json` is read
- **THEN** there is no `"private": true` field

#### Scenario: Package exports and bin are declared

- **WHEN** `apps/cli/package.json` is read
- **THEN** an `exports` field exists mapping `"."` to the compiled output
- **THEN** a `bin` field maps `"ts2v"` to `"dist/index.js"`

#### Scenario: Package files whitelist is set

- **WHEN** `apps/cli/package.json` is read
- **THEN** a `files` field exists containing `["dist", "README.md", "LICENSE"]`

#### Scenario: Package publish config is set for public scoped package

- **WHEN** `apps/cli/package.json` is read
- **THEN** a `publishConfig` field exists with `"access": "public"`

#### Scenario: Package auto-builds before publish

- **WHEN** `apps/cli/package.json` is read
- **THEN** a `"prepare"` script exists that runs `bun run build`

### Requirement: Package has a README for the npm registry page

#### Scenario: README exists and covers installation and usage

- **WHEN** `apps/cli/README.md` is read
- **THEN** the file exists and contains `npm install -g @ts2v/cli` or `bun add @ts2v/cli`
- **THEN** the file shows the `bun run apps/cli/src/index.ts compile` usage (noting no global install in monorepo context)
- **THEN** the file documents that the OSS toolchain container (Yosys/nextpnr/gowin_pack/openFPGALoader) must be available
