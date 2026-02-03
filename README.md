# TaskFlow MCP

**Task Management & Research Tools for AI Assistants**

A Model Context Protocol (MCP) server providing structured task planning, execution tracking, and guided research workflows.

## Purpose

This is a learning exercise to understand Model Context Protocol (MCP) server implementation. The goal is to:

1. Learn MCP protocol mechanics (STDIO communication, tool registration, request/response handling)
2. Understand security-first design
3. Practice TypeScript patterns (async, DI, type systems)
4. Master runtime validation (Zod) alongside compile-time types

## 📚 Documentation for AI Agents

**For AI agents working on this project**:

- **[TYPESCRIPT_CODING_STANDARDS.md](./TYPESCRIPT_CODING_STANDARDS.md)** - Comprehensive coding standards, patterns, and security rules
- **[AI_AGENT_QUICK_REFERENCE.md](./AI_AGENT_QUICK_REFERENCE.md)** - Quick reference for Serena MCP tooling and workflows
- **[SECURITY.md](./SECURITY.md)** - Security threat model and controls

**Critical**: Read `TYPESCRIPT_CODING_STANDARDS.md` at the start of each session to prevent context rot.

## Project Status

🚧 **Under Development** - Educational implementation in progress

### Completed

- ✅ Project structure (layered architecture)
- ✅ Security documentation (SECURITY.md with threat model)
- ✅ Domain types (`src/data/types.ts`)
- ✅ Zod schemas for validation (`src/data/schemas.ts`)
- ✅ Path sanitization utilities (`src/config/pathResolver.ts`)

### In Progress

- 🔄 Data layer (TaskStore, MemoryStore)
- 🔄 MCP server setup
- 🔄 Tool implementations

### Planned

- ⏳ Prompt template system
- ⏳ Testing (Vitest with security tests)
- ⏳ MCP client integration

## Architecture

### Layered Design

```
MCP Client (VS Code, Claude Desktop)
    ↓
Server Layer (MCP SDK, tool registration)
    ↓
Tools Layer (17 MCP tools, business logic)
    ↓
Data Layer (TaskStore, MemoryStore, Zod validation)
    ↓
Storage Layer (.mcp-tasks/ JSON files)
```

### Technology Stack

| Aspect | Implementation |
|--------|----------------|
| **Type Safety** | Compile + Runtime (TypeScript + Zod) |
| **Immutability** | `readonly` interfaces, `readonly T[]` |
| **Async** | `Promise<T>`, native event loop |
| **DI** | Manual constructor injection |
| **Testing** | Vitest |
| **Validation** | Zod schemas (runtime) |

## Security Model

**Threat Model**: See [SECURITY.md](./SECURITY.md)

### Security Controls Implementation

✅ **C1: Security Requirements** - Documented in SECURITY.md
✅ **C2: Security Frameworks** - Using Zod, @modelcontextprotocol/sdk
✅ **C3: Secure Data Access** - JSON schema validation + migration
✅ **C4: Output Encoding** - Markdown template escaping
✅ **C5: Input Validation** - Zod schemas for ALL 17 tools (CRITICAL)
⏳ **C6: Digital Identity** - N/A (local STDIO server)
✅ **C7: Access Controls** - Path sanitization (directory traversal prevention)
✅ **C8: Data Protection** - Secrets in environment variables only
⏳ **C9: Security Logging** - Pino structured logging
✅ **C10: Error Handling** - Generic user messages, detailed server logs

## Installation

```bash
# Install dependencies
npm install

# Type check
npm run type-check

# Build
npm run build

# Run tests
npm test

# Security audit
npm audit --audit-level=moderate
```

## Usage

### VS Code Configuration

Add to `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "task-manager-ts": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "${workspaceFolder}/mcp-task-and-research-ts",
      "env": {
        "DATA_DIR": "${workspaceFolder}/.mcp-tasks-ts"
      }
    }
  }
}
```

### Environment Variables

- `DATA_DIR`: Data directory path (default: `.mcp-tasks`)
- `MCP_WORKSPACE_ROOT`: Workspace root override
- `LOG_LEVEL`: Logging level (default: `info`)
- `ENABLE_COMPLETION_BEEP`: Enable beep notifications (default: `false`)

## Learning Objectives

### 1. MCP Protocol Understanding

- **STDIO Communication**: How MCP clients/servers communicate via stdin/stdout
- **Tool Registration**: How tools are discovered and invoked
- **Request/Response Flow**: JSON-RPC style messaging

### 2. Security Patterns

- **Input Validation**: Why runtime validation (Zod) is critical
- **Path Sanitization**: Preventing directory traversal attacks
- **Error Handling**: Generic user messages vs detailed server logs
- **Schema Versioning**: Backward-compatible data migrations

### 3. TypeScript Best Practices

- **Strict Mode**: Catching bugs at compile-time
- **Readonly Types**: Immutability enforcement
- **Type Inference**: Deriving types from Zod schemas (DRY)
- **ESM Modules**: Modern JavaScript module system

### 4. Async Patterns

- **Promises**: TypeScript async/await vs promises
- **File I/O**: Node.js fs/promises vs .NET async file operations
- **Error Propagation**: try-catch vs Result types

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// Example: Path sanitization test
test('sanitizePath rejects directory traversal', () => {
  expect(() => {
    sanitizePath('../../etc/passwd', '/app/.mcp-tasks');
  }).toThrow('Access denied');
});
```

### Security Tests

- ✅ Input validation (Zod schema rejection)
- ✅ Path sanitization (directory traversal prevention)
- ✅ Error handling (no stack trace leaks)
- ⏳ Schema migration (backward compatibility)

### Coverage Requirements

- **Security-critical paths**: ≥90% coverage
- **Overall**: ≥80% lines, functions, statements

## Cross-Platform Considerations

- Use `path.resolve`/`path.join` and `sanitizePath` to avoid hard-coded separators.
- File systems differ on case sensitivity; keep template and file names consistent.
- Keep line endings as LF in the repo; avoid committing CRLF-only files.
- Ensure the data directory is writable on all platforms.
- MCP STDIO transport is exercised in tests; CI runs on Windows/macOS/Linux.

## Development Workflow

```bash
# Watch mode for development
npm run test:watch

# Type check without building
npm run type-check

# Build for production
npm run build

# Test coverage report
npm run test:coverage
```

## TypeScript Implementation Patterns

### Example: Task Creation with Immutability

**Interface with Readonly Properties**

```typescript
interface TaskItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly dependencies: readonly TaskDependency[];
}

// Update via spread operator (immutable)
const updated: TaskItem = { ...task, status: 'completed' };
```

### Example: Input Validation with Zod

**Runtime Schema Validation**

```typescript
const CreateTaskSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  dependencies: z.array(z.string()).default([])
});

// Runtime validation (throws ZodError on invalid)
const validated = CreateTaskSchema.parse(params);
```

### Example: Async File Operations

**Promise-based File I/O**

```typescript
// Atomic write with temp file + rename
async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const tempFile = `${filePath}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempFile, filePath); // Atomic on POSIX
}
```

## Contributing

This is an educational project. Contributions welcome for:

- Bug fixes
- Security improvements
- Documentation enhancements
- Additional test coverage

## License

MIT License - Educational purposes

## Acknowledgments

- MCP SDK: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- Validation: [Zod](https://github.com/colinhacks/zod)
- Inspiration: [mcp-task-and-research](https://github.com/d-german/mcp-task-and-research) reference implementation
