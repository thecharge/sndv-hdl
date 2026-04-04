# cli-and-workflow-orchestration

**Owner:** Build Agent
**Status:** Production
**Version:** Bootstrap 1.0

## Summary

The `apps/cli/` package is the single user-facing entry point for the ts2v toolchain.
It accepts `compile` commands with board and output flags, orchestrates the compiler core
and toolchain adapters, and optionally triggers flash to connected FPGA hardware.

The CLI is invoked with Bun directly — there is no globally-installed `ts2v` binary.
The canonical invocation is:
```bash
bun run apps/cli/src/index.ts compile <source-path> --board <board.json> --out <dir> [--flash]
```

## Files

- `requirements.md` - Requirements for CLI commands and behavior
- `constraints.md` - Rules for CLI invocation and forbidden patterns
- `scenarios/compile-and-flash.md` - Acceptance scenarios

## Commands

| Command | Description |
|---|---|
| `compile <path>` | Compile TypeScript hardware source to SV + constraints + (optionally) bitstream |
| `compile ... --flash` | Full pipeline: compile + synthesize + flash to connected FPGA |

## Key Source Locations

| Path | Responsibility |
|---|---|
| `apps/cli/src/index.ts` | CLI entry point |
| `apps/cli/src/commands/` | Command handlers (compile, flash) |

## Related Capabilities

- `ts-to-sv-compiler-core` - invoked by the compile command
- `open-source-toolchain-integration` - invoked for synthesis + flash
- `board-configuration-and-support` - `--board` flag selects board definition
