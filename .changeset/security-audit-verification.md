---
"mcp-taskflow": patch
---

Security: Confirmed dependencies are secure against CVE-2026-0621 and CVE-2026-25536

Verified that @modelcontextprotocol/sdk is at version 1.26.0, which includes fixes for:
- CVE-2026-0621: Regular Expression Denial of Service (ReDoS) vulnerability (CVSS 8.7)
- CVE-2026-25536: Cross-Client Data Leak via shared server/transport instance (CVSS 7.1)

All 593 tests pass. No dependency updates required as the project is already using secure versions.
