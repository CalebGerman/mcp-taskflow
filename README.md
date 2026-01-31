# MCP Codex

**Workflow Orchestration for AI Development**

An MCP (Model Context Protocol) server for structured planning, execution, and research workflows.

## Purpose

This is a learning exercise to understand Model Context Protocol (MCP) server implementation by porting the C# version to TypeScript. The goal is to:

1. Learn MCP protocol mechanics (STDIO communication, tool registration, request/response handling)
2. Understand security-first design (OWASP Proactive Controls)
3. Compare TypeScript vs C# patterns (async, DI, type systems)
4. Practice runtime validation (Zod) vs compile-time types

## 📚 Documentation for AI Agents

**For AI agents working on this project**:

- **[TYPESCRIPT_CODING_STANDARDS.md](./TYPESCRIPT_CODING_STANDARDS.md)** - Comprehensive coding standards, patterns, and security rules
- **[AI_AGENT_QUICK_REFERENCE.md](./AI_AGENT_QUICK_REFERENCE.md)** - Quick reference for Serena MCP tooling and workflows
- **[SECURITY.md](./SECURITY.md)** - Security threat model and OWASP controls

**Critical**: Read `TYPESCRIPT_CODING_STANDARDS.md` at the start of each session to prevent context rot.

## Project Status

🚧 **Under Development** - Educational implementation in progress

### Completed

- ✅ Project structure (mirrors C# layered architecture)
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

### Layered Design (Same as C#)

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

### Key Differences from C #

| Aspect | C# | TypeScript |
|--------|-----|------------|
| **Type Safety** | Compile-time (nullable reference types) | Compile + Runtime (TypeScript + Zod) |
| **Immutability** | `record` types, `ImmutableArray<T>` | `readonly` interfaces, `readonly T[]` |
| **Async** | `Task<T>`, `ConfigureAwait(false)` | `Promise<T>`, native event loop |
| **DI** | Microsoft.Extensions.DI | Manual or tsyringe |
| **Testing** | xUnit | Vitest |
| **Validation** | Data annotations, compile-time | Zod schemas (runtime) |

## Security Model

**Threat Model**: See [SECURITY.md](./SECURITY.md)

### OWASP Proactive Controls Implementation

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

- **Promises**: TypeScript's async/await vs C#'s Task<T>
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

## Comparison: C# vs TypeScript

### Example: Task Creation

**C# (Record Type + ImmutableArray)**

```csharp
public record TaskItem(
    string Id,
    string Name,
    string Description,
    TaskStatus Status,
    ImmutableArray<TaskDependency> Dependencies
);

// Update via 'with' expression
var updated = task with { Status = TaskStatus.Completed };
```

**TypeScript (Readonly Interface)**

```typescript
interface TaskItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly dependencies: readonly TaskDependency[];
}

// Update via spread operator
const updated: TaskItem = { ...task, status: 'completed' };
```

### Example: Input Validation

**C# (Data Annotations + ModelState)**

```csharp
public class CreateTaskRequest
{
    [Required]
    [MaxLength(500)]
    public string Name { get; set; }
}
```

**TypeScript (Zod Runtime Validation)**

```typescript
const CreateTaskSchema = z.object({
  name: z.string().min(1).max(500),
});

// Runtime validation (throws on invalid)
const validated = CreateTaskSchema.parse(params);
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

- Original C# implementation: [mcp-task-and-research](https://github.com/d-german/mcp-task-and-research)
- MCP SDK: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- Validation: [Zod](https://github.com/colinhacks/zod)
