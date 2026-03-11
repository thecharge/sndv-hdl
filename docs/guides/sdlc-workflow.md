# SDLC Workflow

## Branching
- Use short-lived feature branches.
- Require PR with completed template and linked issue.

## Local Gates
Run before commit:
```bash
bun run format:check
bun run lint
bun run test
```

## Commit Hook
- Husky pre-commit runs local gates.
- Hook file: `.husky/pre-commit`.

## Release Readiness
- `bun run quality` passes.
- `bun run compile:example` produces artifacts.
- Hardware path is either validated on target board or explicitly marked blocked with logs.

## Incident Logging
- Record every operational failure and mitigation in `docs/append-only-engineering-log.md`.
- Include command lines, timestamps, and outcomes.
