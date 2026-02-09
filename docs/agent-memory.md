# Agent Memory (Shared)

This document is a shared, versioned source of truth for remote agents working in this repo.

## Project Overview

TaskFlow MCP is a local Model Context Protocol (MCP) server that provides structured task planning, execution tracking, and guided research workflows for AI agents. It runs over STDIO JSON-RPC and persists task state to disk for durable context across sessions.

## Tech Stack

- Language/runtime: TypeScript on Node.js (ESM only, Node >= 18).
- Package manager: pnpm.
- MCP SDK: @modelcontextprotocol/sdk.
- Validation: Zod with zod-to-json-schema.
- Logging: pino + pino-pretty.
- Testing: Vitest.
- Linting/formatting: ESLint + Prettier.
- Build/dev: tsc for build, tsx for dev.
- Data storage: JSON files under DATA_DIR (default .mcp-tasks).

## Code Style and Conventions

- Use ESM imports/exports; no require.
- Prefer async/await for IO.
- Keep types explicit at module boundaries; use explicit nullability (| null).
- Use Type[] instead of Array<Type>.
- Keep data immutable (use spreads, avoid mutation).
- Validate all external inputs with Zod schemas.
- Async methods should use the Async suffix in names.
- Comments: explain intent; avoid framework/control references in inline comments; use JSDoc for security documentation when needed.
- Formatting: Prettier enforces 2 spaces, single quotes, trailing commas, 120 char width.
- Note: TYPESCRIPT_CODING_STANDARDS.md is referenced but not present in the repo.

## Project Structure (High Level)

- src/config: workspace and data path resolution.
- src/data: JSON persistence and domain models.
- src/tools: MCP tool implementations by domain (task, research, project, thought).
- src/server: server setup, container, logging, MCP lifecycle.
- src/prompts: prompt builders, template engine, templates.
- scripts: build utilities (template copy).
- tests: unit, integration, platform, security, prompts, server, tools.
- docs: architecture and API documentation.
- benchmarks: performance tooling.

## Suggested Commands (Windows / PowerShell)

### Setup and build

- pnpm install
- pnpm build
- pnpm start
- pnpm dev

### Test and quality

- pnpm test
- pnpm test:coverage
- pnpm run type-check
- pnpm run lint
- pnpm run format
- pnpm run format:check

### Release and maintenance

- pnpm changeset
- pnpm changeset --empty
- pnpm check
- pnpm audit --audit-level=moderate

### Data directory

- $env:DATA_DIR="${PWD}\.mcp-tasks"

## Task Completion Checklist

- Follow repo conventions and keep changes DRY.
- Add or update tests as needed; keep coverage stable or improved.
- Run pnpm test and pnpm run type-check.
- Run pnpm run lint (and format if needed).
- Ensure Zod validation for external inputs and security checks are in place.
- Avoid secrets in code or logs; error messages should be user-safe.
