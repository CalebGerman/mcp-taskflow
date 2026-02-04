# TaskFlow MCP - AI Coding Agent Guide

## Project Overview

TaskFlow MCP is a **Model Context Protocol (MCP) server** built with **Node.js** and **TypeScript**. It provides structured planning, execution tracking, and research workflows for AI agents via MCP tools.

## Architecture & Structure

### Layered Design
```
Config (src/config/) → Data (src/data/) → Tools (src/tools/) → Server (src/server/) → MCP Client
                                  ↓
                          Prompts (src/prompts/)
```

- **Config**: Workspace and data path resolution (see `src/config/pathResolver.ts`)
- **Data**: JSON persistence and domain models (see `src/data/`)
- **Tools**: MCP tool implementations by domain (see `src/tools/`)
- **Server**: MCP server setup and lifecycle (see `src/server/`)
- **Prompts**: Markdown templates for tool responses (see `src/prompts/`)

### Data Flow
1. MCP client invokes a tool via MCP protocol
2. Tool executes business logic
3. Data layer persists updates to JSON files
4. Prompt renderer formats the response
5. Server returns the formatted result

## Code Conventions

- **ESM only**: use `import`/`export`; no `require`
- **Async I/O**: prefer `async`/`await` for filesystem and network work
- **Type safety**: keep types explicit at module boundaries
- **Errors**: throw typed errors with clear messages for user-facing failures

## Essential Commands

```bash
pnpm build
pnpm start
pnpm dev
pnpm test
pnpm test:coverage
pnpm type-check
pnpm lint
```

## Data Storage

- Data lives under `DATA_DIR` (default: `.mcp-tasks` in the workspace root)
- Configure with an environment variable when needed:

```powershell
$env:DATA_DIR="${PWD}\.mcp-tasks"
```

## Prompts and Templates

- Templates live in `src/prompts/`
- Build copies templates into `dist` via `scripts/copy-templates.mjs`

## Testing Notes

- Tests use Vitest (see `tests/`)
- Prefer isolated data directories for test runs
