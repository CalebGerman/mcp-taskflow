# MCP-Taskflow: Detailed Architecture Notes

This document is a deeper walkthrough of the major pieces of the repo so you can answer technical questions confidently.

## 1. System Overview
TaskFlow MCP is a local MCP server that exposes structured workflow tools over JSON-RPC via STDIO. A host (for example, VS Code) runs an MCP client that discovers tools and invokes them with JSON payloads. The server validates inputs, executes logic, and persists task state to disk so work can resume across sessions.

Core layers:
- MCP Server (protocol handling + tool registration)
- Tools layer (task workflow, research, thought, project metadata)
- Data layer (task persistence, rules, snapshots)
- Prompt layer (templated, consistent output)
- Validation and security (Zod schemas, path sanitization, size limits)

## 2. MCP Server Layer
**Purpose**: Implements the MCP JSON-RPC interface, registers tools, and manages request/response flow.

**Key behaviors**:
- Runs locally over STDIO (no network exposure).
- Tool registration is centralized in the server bootstrapping.
- All tool handlers are called through a common execution path that validates inputs and returns structured responses.

**Where**:
- `src/server/mcpServer.ts`
- `src/index.ts`

## 3. Tools Layer
**Purpose**: The API surface exposed to the MCP client. Each tool is an operation the agent can call.

### 3.1 Task Planning and Workflow Tools
- `plan_task`: Turn a goal into a structured plan.
- `split_tasks`: Break the plan into discrete tasks with dependencies.
- `analyze_task`: Capture analysis and rationale.
- `reflect_task`: Record lessons learned or improvements.
- `execute_task`: Mark a task in progress and generate execution context.
- `verify_task`: Score and mark a task complete with summary notes.

### 3.2 Task Management (CRUD)
- `list_tasks`: List tasks by status.
- `get_task_detail`: Fetch full task details.
- `query_task`: Search tasks by keyword or ID.
- `create_task`: Directly create a task without planning.
- `update_task`: Modify status, dependencies, notes, metadata.
- `delete_task`: Remove a task.
- `clear_all_tasks`: Clear all tasks (with confirmation).

### 3.3 Research and Thought Tools
- `research_mode`: Guided research workflow with state tracking.
- `process_thought`: Record a structured reasoning step.

### 3.4 Project Tools
- `init_project_rules`: Create or refresh project rules.
- `get_server_info`: Return server status and task counts.

**Where**:
- `src/tools/task/`
- `src/tools/research/`
- `src/tools/thought/`
- `src/tools/project/`

## 4. Data Layer (Persistence)
**Purpose**: Persist tasks, rules, and history across sessions using local JSON files.

### 4.1 Task Store
- Stores tasks in `tasks.json` under the configured `DATA_DIR`.
- Uses atomic read-modify-write and a write queue for safety.
- Maintains timestamps and status transitions.
- Caches last read to reduce file I/O.

**Where**:
- `src/data/taskStore.ts`
- `src/data/fileOperations.ts`

### 4.2 Rules Store
- Stores project-specific rules in `taskflow-rules.md` under `DATA_DIR`.
- Enforces max file size and basic validation.

**Where**:
- `src/data/rulesStore.ts`

### 4.3 Memory Store (Snapshots and Backups)
- Supports task snapshots and history in a `memory/` folder.
- Supports completed-task backups in a `backups/` folder.
- Implements filename sanitization and size limits.

**Where**:
- `src/data/memoryStore.ts`

**Note**: The `clear_all_tasks` path currently returns no backup in `TaskStore` (there is a TODO to integrate backups), but the `MemoryStore` capability exists.

## 5. Validation Layer (Zod)
**Purpose**: Enforce runtime safety and protect against malformed inputs or oversized payloads.

Key protections:
- UUID validation for task IDs.
- String length limits for names, descriptions, notes, summaries.
- Enumerated status values only.
- Pagination limits for queries.

**Where**:
- `src/data/schemas.ts`

## 6. Prompt Layer (Template Engine + Builders)
**Purpose**: Produce consistent, readable responses and execution prompts.

### 6.1 Template Engine
- Simple token replacement (no external dependencies).
- Supports `{{key}}`, `{{ key }}`, and `{key}` formats.

**Where**:
- `src/prompts/templateEngine.ts`

### 6.2 Template Loader
- Loads markdown templates from disk and caches them.
- Resolves template paths safely and prevents directory traversal.

**Where**:
- `src/prompts/templateLoader.ts`
- `src/prompts/templates/v1/templates_en/`

### 6.3 Prompt Builders
- Compose data into templates for output and tool guidance.

**Where**:
- `src/prompts/taskPromptBuilders.ts`
- `src/prompts/projectPromptBuilder.ts`
- `src/prompts/researchPromptBuilder.ts`
- `src/prompts/thoughtPromptBuilder.ts`

## 7. Configuration and Path Security
**Purpose**: Ensure all file access stays within controlled directories.

Key behavior:
- Workspace root is resolved from `MCP_WORKSPACE_ROOT`, then `cwd`, then home directory.
- `DATA_DIR` defaults to `.mcp-tasks` under workspace root.
- Path sanitization prevents traversal outside allowed directories.

**Where**:
- `src/config/pathResolver.ts`

## 8. Security Controls
**Purpose**: Reduce attack surface and prevent misuse from untrusted inputs.

Controls in codebase:
- Zod validation for all tool inputs.
- Path sanitization and containment checks.
- Size limits on task data and rules files.
- Local STDIO transport (no exposed network port).

**Where**:
- `SECURITY.md`
- `src/data/schemas.ts`
- `src/config/pathResolver.ts`

## 9. Logging and Observability
**Purpose**: Structured logging and safe error handling.

Key points:
- Logs are structured (Pino-based) and avoid leaking sensitive info.
- Errors returned to the user are safe and generic, while server logs contain detail.

**Where**:
- `src/server/logger.ts`

## 10. Testing and Benchmarks
**Purpose**: Ensure protocol compliance, tool correctness, and performance baselines.

Test coverage highlights:
- MCP protocol compliance integration tests.
- Tool behavior tests by category.
- Performance tests in integration suite.

**Where**:
- `tests/integration/`
- `tests/tools/`
- `benchmarks/`

## 11. What People Commonly Miss
- The **template engine and cached loader** are important for consistent outputs and performance.
- The **memory/backup system** exists but is not fully wired into task clearing (TODO in TaskStore).
- **Path sanitization** and workspace resolution are key security mechanisms.
- The **rules system** (`taskflow-rules.md`) is part of the persistence story, not just tasks.

## 12. Practical Takeaway
This repo is not just a set of tools: it is a structured workflow system with strong runtime validation, persistent state, and consistent prompt output. That combination is what makes it more reliable and scalable than a plain chat session.
