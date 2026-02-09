---
"mcp-taskflow": patch
---

Security: Fix high-severity tar vulnerabilities in npm audit

Fixed 6 high-severity vulnerabilities in tar (CVE in versions <= 7.5.6) by adding npm overrides.
Also enforced @modelcontextprotocol/sdk >= 1.26.0 for pnpm to fix:
- CVE-2026-0621: Regular Expression Denial of Service (ReDoS) vulnerability (CVSS 8.7)
- CVE-2026-25536: Cross-Client Data Leak via shared server/transport instance (CVSS 7.1)

Changes:
- Added `overrides` field to package.json for npm (tar >= 7.5.7)
- Added `@modelcontextprotocol/sdk: ">=1.26.0"` to pnpm overrides
- Updated both pnpm-lock.yaml and package-lock.json

Both `npm audit` and `pnpm audit` now pass with 0 vulnerabilities.
All 593 tests pass.
