# Changelog

## 0.1.4

### Patch Changes

### [0.1.4](https://www.npmjs.com/package/taskflow-mcp/v/0.1.4) - 2026-02-09

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

3. **axios <= 1.13.4** (1 high severity):
   - GHSA-43fc-jf86-j433: Denial of Service via **proto** Key in mergeConfig
   - Enforced axios >= 1.13.5 via pnpm override

Changes:

- Added `tar: "^7.5.7"` to pnpm.overrides in package.json
- Added `@modelcontextprotocol/sdk: ">=1.26.0"` to pnpm.overrides in package.json
- Added `axios: ">=1.13.5"` to pnpm.overrides in package.json
- Updated pnpm-lock.yaml with security fixes
- Added package-lock.json to .gitignore (pnpm-only repository)

All 593 tests pass.

## 0.1.3

### Patch Changes

### [0.1.3](https://www.npmjs.com/package/taskflow-mcp/v/0.1.3) - 2026-02-09

Updated readme

## 0.1.2

### Patch Changes

### [0.1.2](https://www.npmjs.com/package/taskflow-mcp/v/0.1.2) - 2026-02-06

Added fix for missing template for get task details

## 0.1.1

### Patch Changes

### [0.1.1](https://www.npmjs.com/package/taskflow-mcp/v/0.1.1) - 2026-02-05

Small docs updates

## 0.1.0

### Minor Changes

### [0.1.0](https://www.npmjs.com/package/taskflow-mcp/v/0.1.0) - 2026-02-05

Initial package release

This project uses Changesets to generate release notes.

For a new release, run the Changesets workflow to create a release PR with version bumps and changelog updates.
