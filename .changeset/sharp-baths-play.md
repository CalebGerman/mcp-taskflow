---
"mcp-taskflow": minor
---

Add MCP Apps support for interactive task visualization

This release adds a complete MCP App implementation that provides an interactive HTML UI for viewing tasks. The implementation includes:

**New Features:**
- `show_todo_list` tool now serves an interactive HTML UI via MCP resources protocol
- UI displays tasks with status badges, dependencies, related files, and timestamps
- Custom MCP Apps resource serving without external SDK dependencies
- React + Vite UI with TypeScript strict mode
- Build automation with `pnpm run build:ui`

**Technical Changes:**
- Added resource registration support to MCP server (`registerResource` method)
- Extended server capabilities to include resources
- Implemented `resources/list` and `resources/read` protocol handlers
- Added `ResourceHandler` interface for type-safe resource management
- Extended `ToolHandler` interface with optional `_meta` field for UI metadata
- UI resource URI: `ui://taskflow/todo` with MIME type `text/html;profile=mcp-app`

**Architecture:**
- No breaking changes - fully backward compatible
- Server works with or without UI build (graceful degradation)
- Type-safe implementation with no `any` assertions
- All existing tests pass (596 tests)
- New tests for MCP Apps functionality

**Build Process:**
```bash
pnpm run build:ui    # Build React UI
pnpm run build       # Build server + copy UI assets
```

**Documentation:**
- Updated README.md with MCP App details
- Updated docs/API.md with resource information
- Added ui/README.md with development guide

