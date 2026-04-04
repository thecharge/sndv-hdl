# Constraints — documentation-and-compliance

---

## Mermaid-Only Diagrams

All diagrams MUST use Mermaid syntax. This enables GitHub rendering without additional tooling.
Any diagram that would take more than 5 lines to draw in ASCII art MUST use Mermaid.

When adding Mermaid diagrams:
- Use `flowchart TD` or `flowchart LR` for pipelines
- Use `graph TD` for dependency trees
- Quote node labels that contain special characters: `["Node: A -> B"]`
- Do NOT use `→` inside quoted labels

---

## Append-Only Log Discipline

The engineering log (`docs/append-only-engineering-log.md`) is a permanent operational record.
It documents what happened, not what should happen. Rules:
- NEVER delete or modify existing entries
- Add entries chronologically at the bottom
- Each entry must be dated
- Commands and output must be exact (copy-paste, not paraphrase)

---

## CLAUDE.md as AI Contract

`CLAUDE.md` is the primary context file for AI assistants. It must:
- Stay in sync with `docs/specification.md` on supported constructs
- Always reflect the current known compiler limitations
- List all forbidden patterns from `AGENTS.md`
- Be updated whenever the supported TS subset changes

If `CLAUDE.md` and `docs/specification.md` diverge, `docs/specification.md` is authoritative
for the compiler, but `CLAUDE.md` is authoritative for AI assistant behavior.

---

## Security and Compliance

`docs/security-compliance.md` tracks the security posture of the repository.
No credentials, API keys, or secrets may be committed. All toolchain images must use
pinned base image versions for reproducibility.

---

## Style Enforcement

Typography rules from AGENTS.md are enforced here as hard constraints:
- `->` not `→` in all files
- ` - ` (hyphen-minus) not `—` (em-dash)
- No separator comments `// -- Label -----`
- No JSDoc blocks on internal functions that add no information
