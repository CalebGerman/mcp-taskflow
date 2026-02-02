# MCP Task and Research Manager - AI Coding Agent Guide



## Project Overview

This is a **Model Context Protocol (MCP) server** built with **.NET 9.0** and **C#** that provides task management and research capabilities for AI assistants. The server implements the MCP specification and exposes tools for structured task planning, dependency management, and guided research workflows.

## Architecture & Structure

### Layered Design
```
Data Layer (Data/) → Business Logic (Tools/) → MCP Server (Server/) → MCP Client
         ↓
   JSON Files (.mcp-tasks/)
```

- **Data Layer** ([Data/](src/Mcp.TaskAndResearch/Data/)): JSON-based persistence, domain models (`TaskStore`, `MemoryStore`, `RulesStore`)
- **Tools Layer** ([Tools/](src/Mcp.TaskAndResearch/Tools/)): MCP tool implementations organized by domain (Task, Research, Project, Thought)
- **Server Layer** ([Server/](src/Mcp.TaskAndResearch/Server/)): Hosting, DI configuration, MCP server lifecycle
- **Prompts Layer** ([Prompts/](src/Mcp.TaskAndResearch/Prompts/)): Markdown template system for tool responses

### Data Flow
1. MCP Client invokes tool via MCP protocol
2. Tool method executes business logic (e.g., [TaskTools.cs](src/Mcp.TaskAndResearch/Tools/Task/TaskTools.cs))
3. Data layer persists changes to JSON files
4. Prompt builder renders response from markdown templates
5. Server returns formatted result to client

### Dependency Injection
All services use constructor injection. Register services in [ServerServices.cs](src/Mcp.TaskAndResearch/Server/ServerServices.cs). Core dependencies:
- `ITaskStore` / `TaskStore`: Task CRUD operations
- `IMemoryStore` / `MemoryStore`: Snapshot and memory management
- `IPromptTemplateRenderer`: Markdown template rendering
- `TimeProvider`: Testable time abstraction

## Critical Code Conventions

### Static Methods (Non-Negotiable)
**Any method not accessing instance state MUST be `static`**. This improves performance, clarifies intent, and enables better testability.

```csharp
// ✅ Correct - no instance state accessed
private static void EnsureDirectory(string path)

// ❌ Wrong - should be static
private void EnsureDirectory(string path)
```

### Immutability First
- Domain models are **`record` types** (see [TaskModels.cs](src/Mcp.TaskAndResearch/Data/TaskModels.cs))
- Collections use **`ImmutableArray<T>`**
- Updates via `with` expressions:
  ```csharp
  var updated = document with { Tasks = document.Tasks.Add(newTask) };
  ```

### Async Patterns
- All I/O operations are async with `Async` suffix
- **Always** use `.ConfigureAwait(false)`:
  ```csharp
  var doc = await ReadDocumentAsync().ConfigureAwait(false);
  ```

### Nullable Reference Types
- Enabled project-wide via `<Nullable>enable</Nullable>`
- Explicit nullability: `string?` for nullable, `string` for non-null
- Check `IsDefaultOrEmpty` on `ImmutableArray<T>` before access

### Naming & Organization
- Private fields: `_fieldName` prefix
- Access modifiers: Explicit `private` over implicit
- File organization: Fields → Constructors → Public methods → Private methods → Static helpers

## Essential Build & Test Commands

```powershell
# Build (from solution root)
dotnet build

# Run server (for local testing)
dotnet run --project src/Mcp.TaskAndResearch/Mcp.TaskAndResearch.csproj

# Run all tests
dotnet test

# Run tests with coverage
dotnet test --collect:"XPlat Code Coverage"

# Publish release build
dotnet publish -c Release -r win-x64 --self-contained false
```

## Data Storage & Isolation

Task data is stored in JSON files under `DATA_DIR` (default: `.mcp-tasks` in workspace root):
- `tasks.json`: All task data with dependencies
- `memory/`: Task snapshots and historical data
- `taskflow-rules.md`: Project-specific coding standards
- `backups/`: Auto-created during clear operations

**Per-repository isolation** is recommended. Configure MCP clients with relative path:
```json
"env": { "DATA_DIR": "./.mcp-tasks" }
```

## Testing Strategy

- **Framework**: xUnit 2.9.2
- **Pattern**: Arrange-Act-Assert with isolated test environments
- **Test helpers**: `TempDirectory`, `EnvironmentScope` for isolated state (see [TestSupport/](tests/Mcp.TaskAndResearch.Tests/TestSupport/))
- **Example**: [TaskStorageTests.cs](tests/Mcp.TaskAndResearch.Tests/Data/TaskStorageTests.cs) demonstrates CRUD, search, and snapshot patterns

## Prompt Template System

Responses are generated from **markdown templates** in [Prompts/v1/templates_en/](src/Mcp.TaskAndResearch/Prompts/v1/templates_en/):
- Each tool has its own folder (e.g., `executeTask/`, `listTasks/`)
- Templates use Handlebars-style placeholders: `{{taskName}}`, `{{description}}`
- Partials for reusable components: `taskDetails.md`, `dependencies.md`

When adding new tools:
1. Create corresponding template folder
2. Add `index.md` with main template
3. Add tool description to `toolsDescription/` folder

## Common Integration Points

### Adding a New MCP Tool
1. Define request/response models in [TaskToolModels.cs](src/Mcp.TaskAndResearch/Tools/Task/TaskToolModels.cs)
2. Implement tool method in [TaskTools.cs](src/Mcp.TaskAndResearch/Tools/Task/TaskTools.cs) with `[Tool]` attribute
3. Create prompt templates in `Prompts/v1/templates_en/{toolName}/`
4. Register any new services in [ServerServices.cs](src/Mcp.TaskAndResearch/Server/ServerServices.cs)

### Modifying Data Schema
1. Update record types in [TaskModels.cs](src/Mcp.TaskAndResearch/Data/TaskModels.cs)
2. Ensure JSON serialization handles new fields (check [JsonSettings.cs](src/Mcp.TaskAndResearch/Data/JsonSettings.cs))
3. Add migration logic if breaking existing data format
4. Update tests to cover new schema

## Project-Specific Patterns

### Dependency Resolution
Task dependencies support **both task IDs and names**. Resolution logic in `TaskServices.ToDependencies()`:
- First attempts exact ID match
- Falls back to case-sensitive name match
- Creates `TaskDependency` records with resolved IDs

### Path Resolution Priority
1. MCP roots protocol (`roots/list` request)
2. `MCP_WORKSPACE_ROOT` environment variable
3. Current working directory (with protected directory detection)
4. User profile (fallback)

See [PathResolver.cs](src/Mcp.TaskAndResearch/Config/PathResolver.cs) for implementation.

### Prompt Customization
Templates support conditional rendering and loops (see [PromptTemplateRenderer.cs](src/Mcp.TaskAndResearch/Prompts/PromptTemplateRenderer.cs)):
- `{{#if condition}}...{{/if}}`
- `{{#each items}}...{{/each}}`
- Nested property access: `{{task.metadata.createdAt}}`

## SOLID Principles in Practice

Every class should have **one clear responsibility**:
- `TaskStore`: Persistence operations only
- `TaskSearchService`: Search/query logic only
- `TaskPromptBuilders`: Response formatting only
- `TaskServices`: Business logic helpers only

Prefer composition over inheritance. Use interfaces for testability and dependency inversion.
