---
"mcp-taskflow": patch
---

Security: Fix high-severity vulnerabilities via pnpm overrides

Added pnpm overrides to fix security vulnerabilities:

1. **tar <= 7.5.6** (6 high severity issues):
   - Arbitrary File Overwrite and Symlink Poisoning
   - Race Condition via Unicode Ligature Collisions
   - Arbitrary File Creation/Overwrite via Hardlink Path Traversal
   - Enforced tar >= 7.5.7 via pnpm override

2. **@modelcontextprotocol/sdk** (2 high severity CVEs):
   - CVE-2026-0621: Regular Expression Denial of Service (ReDoS) vulnerability (CVSS 8.7)
   - CVE-2026-25536: Cross-Client Data Leak via shared server/transport instance (CVSS 7.1)
   - Enforced @modelcontextprotocol/sdk >= 1.26.0 via pnpm override

Changes:
- Added `tar: "^7.5.7"` to pnpm.overrides in package.json
- Added `@modelcontextprotocol/sdk: ">=1.26.0"` to pnpm.overrides in package.json
- Updated pnpm-lock.yaml with security fixes
- Added package-lock.json to .gitignore (pnpm-only repository)

All 593 tests pass.
