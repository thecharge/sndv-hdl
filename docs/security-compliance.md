# Security and Compliance

## Security Baseline
- Use least-privilege container execution where possible.
- Pin tool versions in package manifests and workspace config.
- Keep build/test pipelines deterministic.

## OWASP Alignment
- Reference baseline: OWASP Top 10 2025.
- Project link: https://owasp.org/www-project-top-ten/

## SOC 2 Readiness Guidance
- Maintain change logs and traceability for architectural decisions.
- Enforce CI quality gates for every change.
- Document access model for hardware programming and release artifacts.
- Keep dependency inventory with versions and update policy.

## ISO/IEEE Guidance
- SystemVerilog language reference used by project: IEEE 1800-2017 (repo-local copy in `docs/1800-2017.pdf`).
- Public index references:
  - IEEE Xplore landing: https://ieeexplore.ieee.org/document/8299595
  - ISO catalog landing for standards search: https://www.iso.org/standards.html

## Compliance Note
No claim of formal SOC 2 or ISO certification is made by this repository. This document provides engineering controls and process guidance only.
