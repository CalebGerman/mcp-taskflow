---
"mcp-taskflow": minor
---

Migrate to SDK's McpServer from deprecated Server class

This release migrates the internal server implementation from the deprecated `Server` class to the modern `McpServer` class from `@modelcontextprotocol/sdk`. This is an internal refactoring that maintains full backward compatibility.

**Technical Changes:**
- Replaced deprecated `Server` with SDK's `McpServer` for infrastructure
- Hybrid approach: SDK for resources, underlying Server for tools (JSON Schema compatibility)
- Removed ~80 lines of manual protocol handling code
- Improved resource registration using SDK's built-in methods
- Better async/await patterns in shutdown handling

**Benefits:**
- Modern SDK API with better long-term support
- Cleaner, more maintainable codebase
- Automatic protocol handling for resources
- Future SDK features available
- Better error messages from SDK

**Backward Compatibility:**
- ✅ Public API unchanged
- ✅ All existing tools work as-is
- ✅ JSON Schema support maintained
- ✅ MCP Apps resources work correctly
- ✅ All 596 tests pass

**Note:** This uses a hybrid approach because the SDK's `registerTool` expects Zod schemas, but our codebase uses JSON Schema. We use the underlying `Server.setRequestHandler` for tools while leveraging SDK's McpServer for resources and infrastructure.
