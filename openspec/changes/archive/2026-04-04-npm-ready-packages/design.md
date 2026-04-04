## Context

All three publishable packages are currently `private: true` — a Bun/npm workspace convention that prevents accidental publish. They have `main` and `types` fields pointing to `dist/`, but no `exports` map (which Node.js 12+ and bundlers use for tree-shaking and ESM/CJS dual output), no `files` whitelist (which would otherwise publish the entire source tree), and no `publishConfig`.

The monorepo uses Bun workspaces with TypeScript project references. Each package runs `tsc -p tsconfig.json` to produce `dist/`. The root `tsconfig.json` has `composite: true` project references.

## Goals / Non-Goals

**Goals:**
- Enable `npm publish` for `@ts2v/runtime`, `@ts2v/types`, and `@ts2v/cli`
- Ship only compiled output (no raw TypeScript source in published package)
- Support both ESM and CJS consumers via dual `exports` map
- Add installation-first documentation for each package
- Update getting-started guide to show `npm install` path

**Non-Goals:**
- Automated CI release pipeline (out of scope — scripts only)
- Bundling (tsc output is sufficient; no rollup/esbuild required)
- Breaking any existing workspace-internal imports or build scripts
- Publishing `@ts2v/core`, `@ts2v/toolchain`, `@ts2v/config`, `@ts2v/process` (internal packages)

## Decisions

### Decision 1: Dual ESM + CJS via `exports` map

Each package's `tsconfig.json` currently targets `commonjs`. Rather than maintaining two tsconfig files and two build outputs, we use the `exports` map to expose the CJS `dist/` output under both `require` and `import` conditions. This is the "CJS-first" pattern used by many TypeScript libraries.

Alternative considered: `moduleResolution: "bundler"` + ESM output. Rejected because it would require changing `tsconfig.json` and retesting all compiler internals. The CJS build already works; dual-mode via `exports` is the minimal-risk path.

### Decision 2: `files: ["dist", "README.md", "LICENSE"]`

This explicit whitelist ensures only compiled output, docs, and license are published. Without it, the entire package directory (including `src/`, `tsconfig.json`, test files) would be included.

### Decision 3: Per-package READMEs over a single shared doc

Each package needs its own `README.md` because npm registry pages display the package's own README. A shared doc would leave the registry pages blank.

### Decision 4: No version bump in this change

Packages are currently at `2.0.0`. This change makes them publishable but does not change any API. Version management is deferred to a release workflow change. The `publishConfig` does not force a version bump.

## Risks / Trade-offs

- **workspace:* dependencies in `@ts2v/cli`**: `@ts2v/core`, `@ts2v/toolchain`, `@ts2v/types` are referenced as `workspace:*`. When publishing, Bun/npm resolves these to real semver ranges. If the internal packages are not published, `@ts2v/cli` cannot be installed standalone. Mitigation: document that `@ts2v/cli` requires the full monorepo or a separate publish of all internal packages. For the initial publish, only `@ts2v/runtime` and `@ts2v/types` (which have no workspace dependencies) can be published standalone.
- **Missing `dist/` on publish**: If `bun run build` is not run before publish, `dist/` will be empty. Mitigation: add `"prepare": "bun run build"` script so `npm publish` auto-builds.

## Migration Plan

1. Update `package.json` for each publishable package (remove `private`, add `exports`, `files`, `publishConfig`, `prepare`)
2. Add per-package `README.md` files
3. Update `docs/guides/getting-started.md` and root `README.md`
4. Run `bun run build` and verify `dist/` contents
5. Run `bun run quality` to confirm no regressions
6. Publish order: `@ts2v/types` first, then `@ts2v/runtime` (no internal deps), `@ts2v/cli` last (depends on workspace packages that remain private for now)

No rollback needed — removing `private: true` is non-destructive; existing workspace behaviour is unchanged.
