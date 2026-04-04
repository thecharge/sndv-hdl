## ADDED Requirements

### Requirement: Package is publishable to npm registry

`@ts2v/types` must be installable via `npm install @ts2v/types` or `bun add @ts2v/types`.

#### Scenario: Package has no `private` flag

- **WHEN** `packages/types/package.json` is read
- **THEN** there is no `"private": true` field

#### Scenario: Package exports are declared

- **WHEN** `packages/types/package.json` is read
- **THEN** an `exports` field exists mapping `"."` to the compiled output with require, import, and types conditions

#### Scenario: Package files whitelist is set

- **WHEN** `packages/types/package.json` is read
- **THEN** a `files` field exists containing `["dist", "README.md", "LICENSE"]`

#### Scenario: Package publish config is set for public scoped package

- **WHEN** `packages/types/package.json` is read
- **THEN** a `publishConfig` field exists with `"access": "public"`

#### Scenario: Package auto-builds before publish

- **WHEN** `packages/types/package.json` is read
- **THEN** a `"prepare"` script exists that runs `bun run build`

### Requirement: Package has a README for the npm registry page

#### Scenario: README exists and covers installation and exported types

- **WHEN** `packages/types/README.md` is read
- **THEN** the file exists and contains an `npm install @ts2v/types` code block
- **THEN** the file documents the exported interfaces (`CompileResult`, `CompileDiagnostic`, `SeqTestSpec`, `CombTestSpec`, `TbSpec`)
