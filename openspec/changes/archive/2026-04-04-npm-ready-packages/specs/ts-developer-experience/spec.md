## MODIFIED Requirements

### MODIFIED Requirement: Getting started documentation shows npm install path

Previously, getting started required cloning the repository. The modified requirement adds an npm install path as the primary entry point.

#### Scenario: Getting started guide shows npm install first

- **WHEN** `docs/guides/getting-started.md` is read
- **THEN** the guide presents `npm install @ts2v/runtime` (or `bun add @ts2v/runtime`) before the repository clone instructions
- **THEN** a section explains when to use npm install vs. cloning (npm for using the compiler; clone for contributing or full hardware toolchain)

#### Scenario: Root README leads with npm install

- **WHEN** `README.md` is read
- **THEN** the quick-start or installation section shows `npm install @ts2v/runtime` as the first option
