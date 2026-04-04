## 1. Runtime Package - npm-ready

- [x] 1.1 In `packages/runtime/package.json`, remove `"private": true`, add `exports` field mapping `"."` to `{ "require": "./dist/index.js", "import": "./dist/index.js", "types": "./dist/index.d.ts" }`, add `"files": ["dist", "README.md", "LICENSE"]`, add `"publishConfig": { "access": "public" }`, and add `"prepare": "bun run build"` to scripts
- [x] 1.2 Create `packages/runtime/README.md` covering: installation (`npm install @ts2v/runtime` / `bun add @ts2v/runtime`), available decorators (`@Module`, `@Input`, `@Output`, `@Submodule`, `@Sequential`, `@Combinational`, `@Assert`, `@ModuleConfig`) with one-line descriptions, runtime types (`Logic<N>`, `Bit`, `LogicArray`, `Uint8`/`Uint16`/`Uint32`) with bit-width notes, `HardwareModule` base class usage, and a minimal blinker example
- [x] 1.3 Run `bun run build` in `packages/runtime` and confirm `dist/index.js` and `dist/index.d.ts` are present

## 2. Types Package - npm-ready

- [x] 2.1 In `packages/types/package.json`, remove `"private": true`, add `exports` field, `files`, `publishConfig`, and `"prepare"` script (same pattern as runtime)
- [x] 2.2 Create `packages/types/README.md` covering: installation, exported compiler interfaces (`CompileResult`, `CompileDiagnostic`, `CompileArtifacts`), testbench spec types (`SeqTestSpec`, `CombTestSpec`, `TbSpec`), and a code example showing how to type-check a compile result
- [x] 2.3 Run `bun run build` in `packages/types` and confirm `dist/` output

## 3. CLI Package - npm-ready

- [x] 3.1 In `apps/cli/package.json`, remove `"private": true`, add `exports` field, `files`, `publishConfig`, update `bin` to point to `dist/index.js`, and add `"prepare"` script
- [x] 3.2 Create `apps/cli/README.md` covering: global installation (`npm install -g @ts2v/cli`), usage (`bun run apps/cli/src/index.ts compile <dir> --board <board.json> --out <dir> [--flash]`), required OSS toolchain container, supported boards (Tang Nano 20K), and `--diagnostics=json` flag
- [x] 3.3 Run `bun run build` in `apps/cli` and confirm `dist/index.js` is present

## 4. Documentation Updates

- [x] 4.1 In `docs/guides/getting-started.md`, add an "Installation" section before the existing "Clone the repository" section that shows `npm install @ts2v/runtime` (or `bun add @ts2v/runtime`) and explains this is sufficient for writing synthesisable TypeScript; clone path is needed for full hardware toolchain
- [x] 4.2 In `README.md`, add `npm install @ts2v/runtime` to the quick-start or installation section as the first option, before the clone instructions

## 5. Quality Gate

- [x] 5.1 Run `bun run build` from the workspace root and confirm all packages build without errors
- [x] 5.2 Run `bun run quality` from the workspace root and confirm it passes with zero errors
