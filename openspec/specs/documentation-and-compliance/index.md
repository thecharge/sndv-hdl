# documentation-and-compliance

**Owner:** Documentation Agent
**Status:** Active
**Version:** Bootstrap 1.0

## Summary

This capability governs all documentation production, maintenance, and compliance
tracking for the ts2v project. It ensures:
- IEEE 1800-2017 compliance is tracked and current
- The TypeScript subset is fully documented for human and AI contributors
- Operational decisions are logged append-only
- All guides are cross-referenced in `README.md`

## Files

- `requirements.md` - Requirements for documentation and compliance
- `constraints.md` - Rules for documentation authoring and formatting

## Key Source Locations

| Path | Responsibility |
|---|---|
| `docs/specification.md` | Language and generation spec |
| `docs/compliance.md` | IEEE 1800-2017 and OSS tool compliance |
| `docs/architecture.md` | System architecture with Mermaid diagrams |
| `docs/append-only-engineering-log.md` | Append-only operational log |
| `docs/production-readiness.md` | Production acceptance workflow |
| `docs/guides/` | Getting started, board authoring, toolchain guides |
| `CLAUDE.md` | AI/LLM project context and forbidden patterns |
| `AGENTS.md` | Agent roles and ownership boundaries |
| `README.md` | Entry point with documentation index |

## Related Capabilities

- All capabilities — documentation references every other capability
