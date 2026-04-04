# Requirements — documentation-and-compliance

Keyed REQ-DOCS-NNN.

---

## Coverage

REQ-DOCS-001: Every public-facing feature (decorator, type, CLI flag, board) SHALL be
documented in at least one of: `docs/specification.md`, `CLAUDE.md`, or a guide in
`docs/guides/`.

REQ-DOCS-002: All compiler limitations (known gaps) SHALL be documented in `CLAUDE.md`
under "Known Compiler Limitations" with: the limitation, the workaround, and a placeholder
for the proposal that will resolve it.

REQ-DOCS-003: Every new guide added to `docs/guides/` SHALL be referenced in `README.md`
under the Documentation Index.

REQ-DOCS-004: Every new hardware example SHALL be added to `README.md` and
`docs/guides/examples-matrix.md`.

---

## Diagrams

REQ-DOCS-010: All flow, architecture, and pipeline diagrams in `docs/` SHALL use Mermaid
(` ```mermaid ` blocks). ASCII art and plain-text diagrams are FORBIDDEN.

REQ-DOCS-011: Mermaid node labels SHALL NOT use Unicode arrows (`→`). Use `->` inside
quoted labels: `["A -> B"]`.

---

## Append-Only Engineering Log

REQ-DOCS-020: All hardware operational decisions (flash results, programmer profiles, new
board support) SHALL be appended to `docs/append-only-engineering-log.md`.

REQ-DOCS-021: The log SHALL be append-only. Existing entries MUST NOT be modified or deleted.

REQ-DOCS-022: Each log entry SHALL include: date, decision/result, exact commands run,
and observed output.

---

## IEEE Compliance Tracking

REQ-DOCS-030: `docs/compliance.md` SHALL accurately reflect the current SystemVerilog
output compliance including: which IEEE 1800-2017 constructs are generated, which tools
are validated, and which boards are supported.

REQ-DOCS-031: When the compiler gains or loses support for any SV construct, `docs/compliance.md`
and `docs/specification.md` SHALL be updated in the same change.

---

## Typography and Formatting Rules (from AGENTS.md)

REQ-DOCS-040: Unicode arrow `->` MUST be written as `->` (hyphen-minus + greater-than).
Never use `→`.

REQ-DOCS-041: Em-dash MUST be written as ` - ` (space-hyphen-minus-space). Never use `—`
or `--` as em-dash substitutes.

REQ-DOCS-042: `// -- Label -----` separator comments are FORBIDDEN in source files.

REQ-DOCS-043: No other non-ASCII typographic symbols in source comments or Markdown prose.
