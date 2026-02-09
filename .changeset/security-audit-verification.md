---
"mcp-taskflow": patch
---

Security: Fix high-severity vulnerabilities CVE-2026-0621 and CVE-2026-25536

Added pnpm override to enforce @modelcontextprotocol/sdk >= 1.26.0, which includes fixes for:
- CVE-2026-0621: Regular Expression Denial of Service (ReDoS) vulnerability (CVSS 8.7)
- CVE-2026-25536: Cross-Client Data Leak via shared server/transport instance (CVSS 7.1)

Changes:
- Added `@modelcontextprotocol/sdk: ">=1.26.0"` to pnpm overrides in package.json
- Updated pnpm-lock.yaml to enforce the minimum version constraint

All 593 tests pass.
