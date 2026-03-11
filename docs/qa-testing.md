# QA and Testing

## Unit Tests
- Test runner: `bun test`
- Current package tests:
  - CLI parser tests
  - Config service tests
  - Core compilation facade tests
  - Toolchain command factory tests

## Quality Gates
```bash
bun run quality
```
This executes:
- Typecheck
- Lint
- Tests
- Build

## Regression Strategy
- Keep source-level unit tests for all command/facade/repository boundaries.
- Add board-specific integration tests as toolchain availability increases.
- Capture failures and remediation in append-only engineering log.
