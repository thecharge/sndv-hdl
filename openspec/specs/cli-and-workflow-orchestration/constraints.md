# Constraints — cli-and-workflow-orchestration

---

## Canonical Invocation (Hard Rule)

The CLI has no global install. All documentation, scripts, and references MUST use:
```bash
bun run apps/cli/src/index.ts compile ...
```

The following forms are FORBIDDEN in any docs, comments, or scripts:
- `ts2v compile ...`
- `ts2v build ...`
- `npx ts2v ...`
- Any form that implies a globally-installed binary

---

## Directory vs File Compilation

Passing a single `.ts` file for multi-file designs will compile ONLY that file, missing
modules defined in sibling files. This causes silent failures where synthesis has an empty
or incomplete design.

For multi-file designs, ALWAYS pass the directory (or `hw/` subdirectory):
```bash
# Correct
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/ws2812_demo ...

# Wrong — misses other .ts files in the directory
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/ws2812_demo/ws2812_demo.ts ...
```

---

## Client Directory Exclusion

The CLI MUST NOT compile files in `client/` subdirectories when the user passes the
parent directory. Only `hw/` content is hardware source.

---

## No Global Tool References

Any convenience scripts (like `flash.sh`, `run.sh`) in example directories must invoke
the CLI using the same `bun run apps/cli/src/index.ts` form. Scripts may not assume a
globally-installed `ts2v` binary.
