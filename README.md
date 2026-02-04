# TaskFlow MCP



## Table of Contents 📌

- [Overview](#overview-)
- [What Is MCP?](#what-is-mcp-)
- [Quick Start](#quick-start-)
- [Installation](#installation-)
- [Basic Usage](#basic-usage-)
- [Tools Overview](#tools-overview-)
- [Example: Agent-in-the-Loop (ReBAC Feature)](#example-agent-in-the-loop-rebac-feature-)
- [Documentation](#documentation-)
- [Development](#development-)
- [Versioning](#versioning-)
- [License](#license-)

A local Model Context Protocol (MCP) server that gives AI agents structured task planning, execution tracking, and guided research workflows.

## Overview ✨

TaskFlow MCP helps agents turn vague goals into concrete, trackable work. It provides a persistent task system plus research and reasoning tools so agents can plan, execute, and verify tasks without re‑sending long context every time.

### Why Use It ✅

- **Lower token use**: retrieve structured task summaries instead of restating context.
- **Smarter workflows**: dependency‑aware planning reduces rework.
- **Better handoffs**: tasks, notes, and research state persist across sessions.
- **More reliable execution**: schemas validate tool inputs.
- **Auditability**: clear task history, verification, and scores.

## What Is MCP? 🤔

MCP is a standard way for AI tools to call external capabilities over JSON‑RPC (usually STDIO). This server exposes tools that an agent can invoke to plan work, track progress, and keep context consistent across long sessions.

## Quick Start 🚀

```bash
pnpm install
pnpm build
pnpm start
```

## Installation 📦

```bash
# npm
npm install

# yarn
yarn install

# pnpm
pnpm install
```

## Basic Usage ▶️

### Start the server

```bash
pnpm start
```

### Configure data directory (optional)

```bash
# PowerShell
$env:DATA_DIR="${PWD}\.mcp-tasks"
```

## Client Setup 📎

Copy‑paste examples for popular MCP clients. Replace `<PATH_TO_REPO>` and `<DATA_DIR>` with your own paths.

Path examples:
- Windows: `<PATH_TO_REPO>` = `C:\repos\taskflow-mcp`, `<DATA_DIR>` = `C:\repos\taskflow-mcp\.mcp-tasks`
- macOS/Linux: `<PATH_TO_REPO>` = `/Users/you/repos/taskflow-mcp`, `<DATA_DIR>` = `/Users/you/repos/taskflow-mcp/.mcp-tasks`

### VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "taskflow-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["<PATH_TO_REPO>\\dist\\index.js"],
      "env": {
        "DATA_DIR": "<DATA_DIR>"
      }
    },
    "taskflow-mcp-git": {
      "type": "stdio",
      "command": "cmd",
      "args": [
        "/c",
        "pnpm",
        "dlx",
        "git+https://github.com/<org>/<repo>.git",
        "taskflow-mcp"
      ],
      "env": {
        "DATA_DIR": "<DATA_DIR>"
      }
    }
  }
}
```

### Claude Desktop (settings JSON)

```json
{
  "mcpServers": {
    "taskflow-mcp": {
      "command": "node",
      "args": ["<PATH_TO_REPO>\\dist\\index.js"],
      "env": { "DATA_DIR": "<DATA_DIR>" }
    }
  }
}
```

### Codex (config.toml)

```toml
[mcp_servers.taskflow-mcp]
type = "stdio"
command = "node"
args = ["<PATH_TO_REPO>\\dist\\index.js"]
env = { DATA_DIR="<DATA_DIR>" }
startup_timeout_sec = 120
```

## Tools Overview 🧰

TaskFlow MCP exposes a focused toolset. Most clients surface these as callable actions for your agent.

### Planning

- **plan_task**: turn a goal into a structured plan
- **split_tasks**: split a plan into discrete tasks with dependencies
- **analyze_task**: capture analysis and rationale
- **reflect_task**: record reflections and improvements

### Task Management

- **list_tasks**: list tasks by status
- **get_task_detail**: show full details for a task
- **query_task**: search tasks by keyword or ID
- **create_task**: create a task directly
- **update_task**: update status, notes, dependencies, or metadata
- **delete_task**: remove a task by ID
- **clear_all_tasks**: clear the task list

### Workflow

- **execute_task**: mark a task in progress and generate an execution prompt
- **verify_task**: score and mark a task complete

### Research & Project

- **research_mode**: guided research with state tracking
- **process_thought**: capture a structured reasoning step
- **init_project_rules**: create or refresh project rules
- **get_server_info**: get server status and task counts

## Example: Agent-in-the-Loop (ReBAC Feature) 🧪

Below is a simple, human‑readable script that shows how a user might ask an agent to plan and execute a feature. The agent uses TaskFlow MCP tools behind the scenes, but you don’t need MCP details to follow the flow.

**User**
“I want to add a Relationship‑Based system. Create a task list and start working through it.”

**Agent**
“I’ll plan the work, split it into tasks, and track progress as we go.”

**Agent (planning summary)**
“Here’s a structured plan with dependencies and a clear execution order.”

1. **Define the ReBAC model**
   - Entities, relations, and permission checks
   - Identify critical query patterns
2. **Design the storage layer**
   - Graph storage schema and indexes
   - Query strategy for path checks
3. **Implement the policy engine**
   - Relationship evaluation
   - Cached query results
4. **Integrate with existing auth**
   - Request context mapping
   - Backward compatibility
5. **Add tests and benchmarks**
   - Unit tests for rules
   - Integration tests for policy decisions

**Agent (starts work)**
“I’ll mark the first task as in progress and add notes as I go.”

**Progress updates**
- Task 1: In progress — “Drafted entity/relationship schema and example checks”
- Task 1: Completed — “Added model doc and validation rules”
- Task 2: In progress — “Evaluating graph storage options”

**Task verification example (with scoring and challenges)**
**Agent**
“I’ve verified Task 1 and logged a score.”

- **Score**: 92/100
- **Checks passed**: model completeness, schema validation, examples included
- **Challenges**: ambiguous relationship naming in legacy data; resolved by adding a normalization step and a short mapping table
- **Next step**: start Task 2 with the normalized model in place

**Why this helps**
- The agent keeps a durable task list and status updates.
- You can stop and resume without losing context.
- Large features become manageable, with explicit dependencies.

## Documentation 📚

| Document | Purpose |
|---|---|
| **[docs/API.md](./docs/API.md)** | Tool overview and API surface |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | High-level architecture |
| **[docs/PERFORMANCE.md](./docs/PERFORMANCE.md)** | Benchmarks and performance targets |
| **[AI_AGENT_QUICK_REFERENCE.md](./AI_AGENT_QUICK_REFERENCE.md)** | Agent workflow reference |
| **[SECURITY.md](./SECURITY.md)** | Threat model and controls |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Contribution workflow and changesets |
| **[CHANGELOG.md](./CHANGELOG.md)** | Release notes |

## Development 🛠️

```bash
pnpm test
pnpm type-check
pnpm lint
```

## Versioning 🏷️

This project uses **Changesets** for versioning and release notes. See `CONTRIBUTING.md` for guidance.

## Release and Git-Based Usage 🚢

Git-based execution assumes the repository is buildable and includes a valid `bin` entry in `package.json`. For production or shared use, prefer a tagged release published via Changesets.

Typical flow:
1. Add a changeset in your PR.
2. CI creates a release PR with version bumps and changelog entries.
3. Merging the release PR publishes to npm and creates a GitHub release.

Use git-based execution for fast testing; use npm releases for stable installs.

### Git-based launch (recommended)

```bash
# pnpm
pnpm dlx git+https://github.com/<org>/<repo>.git taskflow-mcp

# npx (fallback)
npx git+https://github.com/<org>/<repo>.git taskflow-mcp
```

**Prerequisites**:
- `bin` entry points to `dist/index.js`
- `pnpm build` completes successfully

## License 📄

MIT. See **[LICENSE.md](./LICENSE.md)**.

## Credit 🙏

Inspired by:

```text
https://github.com/cjo4m06/mcp-shrimp-task-manager
```

Also informed by related MCP server patterns and workflows:

```text
https://www.nuget.org/packages/Mcp.TaskAndResearch
```
