# Project Rename Summary

**Date**: January 31, 2026
**Old Name**: `mcp-task-and-research-ts`
**New Name**: `mcp-codex`

## Files Changed

### 1. `package.json`

- ✅ `name`: `mcp-task-and-research-ts` → `mcp-codex`
- ✅ `description`: Updated to "MCP server for workflow orchestration, planning, and structured development"
- ✅ `bin`: Command name changed from `mcp-task-and-research-ts` to `mcp-codex`

### 2. `src/server/mcpServer.ts`

- ✅ Server metadata name (line 56): `mcp-task-and-research-ts` → `mcp-codex`
- ✅ `get_server_info` tool response (line 270): `mcp-task-and-research-ts` → `mcp-codex`

### 3. `README.md`

- ✅ Title updated: "MCP Codex"
- ✅ Subtitle updated: "Workflow Orchestration for AI Development"

### 4. `TYPESCRIPT_CODING_STANDARDS.md`

- ✅ Title updated to "TypeScript Coding Standards - MCP Codex"
- ✅ Project field: `mcp-codex`
- ✅ Last Updated: January 31, 2026

### 5. `.serena/project.yml`

- ✅ `project_name`: `mcp-codex`

## Verification

✅ **All 287 tests passing** (0 failures, 1 skipped)
✅ **TypeScript compilation**: No errors
✅ **Package name**: Updated successfully

## Next Steps for New Repository

When you copy this directory to your new repo:

1. **Rename the directory itself** (optional):

   ```bash
   # From: E:\GIT\new-repo\mcp-task-and-research-ts
   # To:   E:\GIT\new-repo\mcp-codex
   ```

2. **Update git remote** (if starting fresh):

   ```bash
   git remote add origin https://github.com/your-username/mcp-codex.git
   git push -u origin main
   ```

3. **Files you DON'T need to copy**:
   - `node_modules/` (regenerate with `pnpm install`)
   - `dist/` (regenerate with `pnpm build`)
   - `.mcp-tasks/` (optional - start fresh in new repo)

4. **Reinstall dependencies**:

   ```bash
   pnpm install
   pnpm build
   pnpm test
   ```

## Installation Command (After Publishing)

Users will install with:

```bash
npm install -g mcp-codex
# or
pnpm add -g mcp-codex
```

And run with:

```bash
mcp-codex
```

## MCP Client Configuration

Update your MCP client config to use the new name:

```json
{
  "mcpServers": {
    "codex": {
      "command": "mcp-codex",
      "args": []
    }
  }
}
```

## Notes

- All internal references have been updated
- No breaking changes to functionality
- Tests verify everything works correctly
- Ready to copy to new repository
