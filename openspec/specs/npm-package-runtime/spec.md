# npm-package-runtime Specification

## Purpose
Defines the requirements for `@ts2v/runtime` to be publishable to the npm registry and usable by projects that install it as a dependency.

## Requirements

### Requirement: Package is publishable to npm registry

`@ts2v/runtime` must be installable via `npm install @ts2v/runtime` or `bun add @ts2v/runtime`.

#### Scenario: Package has no `private` flag

- **WHEN** `packages/runtime/package.json` is read
- **THEN** there is no `"private": true` field

#### Scenario: Package exports are declared

- **WHEN** `packages/runtime/package.json` is read
- **THEN** an `exports` field exists mapping `"."` to the compiled `dist/index.js` (require) and `dist/index.js` (import) and `dist/index.d.ts` (types)

#### Scenario: Package files whitelist is set

- **WHEN** `packages/runtime/package.json` is read
- **THEN** a `files` field exists containing `["dist", "README.md", "LICENSE"]`

#### Scenario: Package publish config is set for public scoped package

- **WHEN** `packages/runtime/package.json` is read
- **THEN** a `publishConfig` field exists with `"access": "public"`

#### Scenario: Package auto-builds before publish

- **WHEN** `packages/runtime/package.json` is read
- **THEN** a `"prepack"` script exists that runs `bun run build`

### Requirement: Package has a README for the npm registry page

#### Scenario: README exists and covers installation

- **WHEN** `packages/runtime/README.md` is read
- **THEN** the file exists and contains an `npm install @ts2v/runtime` code block
- **THEN** the file documents the available decorators and types
