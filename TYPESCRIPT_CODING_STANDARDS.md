# TypeScript Coding Standards - MCP Codex

**Last Updated**: January 31, 2026
**Project**: mcp-codex
**Language**: TypeScript (Strict Mode)

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Type System Rules](#type-system-rules)
3. [Code Organization](#code-organization)
4. [Security & Validation](#security--validation)
5. [Testing Requirements](#testing-requirements)
6. [Patterns & Best Practices](#patterns--best-practices)
7. [Serena MCP Tooling](#serena-mcp-tooling)
8. [Educational Approach](#educational-approach)

---

## Core Principles

### 1. DRY (Don't Repeat Yourself)

**Rule**: Extract duplicated types, interfaces, and logic into reusable components.

```typescript
// ❌ BAD: Duplicated inline types
interface RequestA {
  files?: Array<{ path: string; type: string }>;
}
interface RequestB {
  files?: Array<{ path: string; type: string }>;
}

// ✅ GOOD: Extracted type
interface FileInfo {
  path: string;
  type: string;
}
interface RequestA {
  files?: FileInfo[];
}
interface RequestB {
  files?: FileInfo[];
}
```

### 2. Immutability First

**Rule**: Prefer `const`, `readonly`, and immutable data structures.

```typescript
// ✅ GOOD: Immutable patterns
const updatedTasks = [...document.tasks];  // Copy before modify
const updated: TaskItem = { ...existing, name: newName };  // Object spread

// ✅ GOOD: Readonly fields
export class TaskStore {
  private readonly tasksFilePath: string;  // Cannot be reassigned
  private readonly handlers: TaskChangeHandler[] = [];
}
```

### 3. Explicit Over Implicit

**Rule**: Make types, nullability, and intentions explicit.

```typescript
// ✅ GOOD: Explicit nullability
description?: string | null;  // Can be undefined OR null
notes: string | null;          // Can be null but not undefined

// ✅ GOOD: Explicit type assertions with comments
const existing = document.tasks[index]!; // Safe: index validated above
```

---

## Type System Rules

### 1. Array Type Syntax

**Rule**: Use `Type[]` syntax instead of `Array<Type>`.

```typescript
// ✅ GOOD
relatedFiles?: RelatedFileInfo[];
dependencies: TaskDependency[];

// ❌ BAD
relatedFiles?: Array<RelatedFileInfo>;
```

### 2. Discriminated Unions

**Rule**: Use discriminated unions for event types and state machines.

```typescript
// ✅ GOOD: Type-safe event handling
export type TaskChangeEvent =
  | { type: 'created'; task: TaskItem }
  | { type: 'updated'; task: TaskItem }
  | { type: 'deleted'; task: TaskItem }
  | { type: 'cleared' };

// Usage provides type narrowing
if (event.type === 'created') {
  console.log(event.task.name); // TypeScript knows task exists
}
```

### 3. Three-Way Null Handling

**Rule**: Distinguish between `undefined` (omitted), `null` (explicitly cleared), and values.

```typescript
// In update operations:
notes: request.notes !== undefined ? request.notes : existing.notes;

// undefined in request → Keep existing value
// null in request → Clear the field
// string in request → Update to new value
```

### 4. Type Extraction from Enums/Literals

**Rule**: Extract repeated literal unions into type aliases.

```typescript
// ✅ GOOD
type RelatedFileType = 'TO_MODIFY' | 'REFERENCE' | 'CREATE' | 'DEPENDENCY' | 'OTHER';

export interface RelatedFileInfo {
  type: RelatedFileType;  // Single source of truth
}
```

### 5. Utility Types (Pick, Omit, Partial, etc.)

**Rule**: Use TypeScript utility types to derive types from existing ones (DRY principle).

```typescript
// ✅ GOOD: Derive from TaskItem
type TaskCreatableFields = Pick<
  TaskItem,
  'name' | 'description' | 'notes' | 'analysisResult'
>;

export interface TaskCreateRequest extends TaskCreatableFields {
  dependencies?: string[];  // Additional fields
}

type TaskUpdatableFields = Partial<
  Pick<TaskItem, 'name' | 'description' | 'notes' | 'status' | 'summary'>
>;

export interface TaskUpdateRequest extends TaskUpdatableFields {
  dependencies?: string[] | null;
}

// ❌ BAD: Duplicating field definitions
export interface TaskCreateRequest {
  name: string;              // Duplicates TaskItem.name
  description: string;       // Duplicates TaskItem.description
  notes?: string | null;     // Duplicates TaskItem.notes
}
```

**Common Utility Types:**
- `Pick<T, K>` - Select subset of properties
- `Omit<T, K>` - Remove properties
- `Partial<T>` - Make all properties optional
- `Required<T>` - Make all properties required
- `Readonly<T>` - Make all properties readonly
- `Record<K, V>` - Create type with specific keys and value type

**Benefits:**
- Single source of truth (changes to TaskItem automatically propagate)
- Type safety (compiler catches mismatches)
- Self-documenting (clearly shows relationship between types)
- Reduces maintenance burden

---

## Code Organization

### 1. File Structure Order

```typescript
// 1. Imports
import { ... } from './module.js';

// 2. Type definitions (enums, type aliases)
type MyType = 'A' | 'B';

// 3. Interfaces (DTOs, contracts)
export interface MyRequest { ... }

// 4. Classes
export class MyClass {
  // 4a. Fields (private readonly first)
  private readonly field: string;
  private handlers: Handler[] = [];

  // 4b. Constructor
  constructor() { ... }

  // 4c. Public methods
  public async myMethod() { ... }

  // 4d. Private methods
  private helperMethod() { ... }

  // 4e. Static helpers (last)
  private static validateInput() { ... }
}
```

### 2. Method Naming Conventions

**Rule**: Async methods use `Async` suffix.

```typescript
// ✅ GOOD
public async getAllAsync(): Promise<TaskItem[]>
public async createAsync(request: TaskCreateRequest): Promise<TaskItem>
private async readDocumentAsync(): Promise<TaskDocument>

// Synchronous methods (no suffix)
private findTaskIndex(tasks: TaskItem[], taskId: string): number
private toDependencies(strings: string[], tasks: TaskItem[]): TaskDependency[]
```

### 3. Access Modifiers

**Rule**: Always explicit (never rely on default `public`).

```typescript
// ✅ GOOD: Explicit modifiers
public async createAsync() { ... }
private async readDocumentAsync() { ... }
private readonly tasksFilePath: string;
```

---

## Security & Validation

### 1. Input Validation with Zod

**Rule**: Validate ALL external inputs using Zod schemas.

```typescript
// ✅ GOOD: Validate before using
TaskItemSchema.parse(task);  // Throws if invalid

// Security benefits:
// - Type validation (prevent injection)
// - Length limits (DoS protection)
// - Format validation (datetime, UUID)
```

### 2. Array Bounds Checking

**Rule**: Always validate array indices before access.

```typescript
// ✅ GOOD: Defensive bounds checking
const index = this.findTaskIndex(document.tasks, taskId);
if (index < 0) {
  return null;  // Early return on not found
}
const existing = document.tasks[index]!; // Safe: validated above
```

**Note**: ESLint `security/detect-object-injection` warnings are false positives when proper validation exists.

### 3. Error Isolation

**Rule**: Use try-catch to prevent cascading failures.

```typescript
// ✅ GOOD: Isolated error handling
for (const handler of this.handlers) {
  try {
    handler(event);
  } catch (error) {
    // Don't let one bad handler break the system
    console.error('Error in task change handler:', error);
  }
}
```

---

## Testing Requirements

### 1. Test Coverage Standards

**Rule**: Comprehensive test coverage for all features.

- **CRUD operations**: Test create, read, update, delete, clear
- **Edge cases**: Not found, empty data, null values
- **Validation**: Invalid inputs, schema violations
- **Business logic**: Dependency resolution, timestamp management, status transitions
- **Events**: Subscriptions, notifications, unsubscribe, error handling

### 2. Test Isolation

**Rule**: Each test must run in isolated environment.

```typescript
// ✅ GOOD: Unique temp directory per test
const tempDir = `${os.tmpdir()}/taskstore-${Date.now()}-${Math.random().toString(36)}`;
const store = new TaskStore(tempDir);

// ✅ GOOD: Clean up after tests
afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});
```

### 3. Vitest Configuration

**Rule**: Disable file parallelism to prevent race conditions.

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    fileParallelism: false  // Run test files sequentially
  }
});
```

---

## Patterns & Best Practices

### 1. Repository Pattern

**Rule**: Centralize data access in dedicated store classes.

```typescript
// TaskStore = Repository for task data
// - Abstracts persistence layer
// - Provides CRUD interface
// - Handles validation and business logic
```

### 2. Observer Pattern (Event System)

**Rule**: Emit events AFTER successful operations to decouple side effects.

```typescript
// ✅ GOOD: Event after success
await this.writeDocumentAsync(updatedDocument);  // Atomic write
this.notifyHandlers({ type: 'created', task });  // Only if write succeeded

// Benefits:
// - Decoupling: UI, logging, analytics can subscribe independently
// - Consistency: Events only fire on successful operations
// - Open/Closed: Add features without modifying core logic
```

### 3. Read-Modify-Write Pattern

**Rule**: Use atomic read-modify-write for all state changes.

```typescript
// Pattern:
// 1. READ: Load current state
const document = await this.readDocumentAsync();

// 2. VALIDATE: Check preconditions
if (index < 0) return null;

// 3. MODIFY: Create new state (immutably)
const updated = { ...existing, ...changes };
const newTasks = [...document.tasks];

// 4. WRITE: Persist atomically
await this.writeDocumentAsync(updatedDocument);

// 5. NOTIFY: Emit events
this.notifyHandlers({ type: 'updated', task: updated });
```

### 4. Dependency Injection for Testability

**Rule**: Accept configuration via constructor parameters.

```typescript
// ✅ GOOD: Allows test isolation
constructor(dataDir?: string) {
  this.tasksFilePath = getDataPath('tasks.json', dataDir);
}

// Usage in tests:
const store = new TaskStore('/tmp/test-123');  // Isolated directory
```

### 5. Pure Functions

**Rule**: Prefer pure functions (no side effects, deterministic).

```typescript
// ✅ GOOD: Pure function
private toDependencies(strings: string[], allTasks: TaskItem[]): TaskDependency[] {
  // All inputs via parameters
  // No mutations of inputs
  // Returns new array
  // Deterministic (same inputs = same output)
}
```

---

## Serena MCP Tooling

### 1. Tool Selection Priority

When working with the codebase:

1. **For security documentation/research**: Use `ref` MCP server (`ref_search_documentation`, `ref_read_url`)
2. **For threat modeling/research**: Use `task-manager` MCP server (`research_mode`, `analyze_task`)
3. **For all code/file/shell operations**: Use `serena` MCP server tools

### 2. Serena Tool Workflow

```
1. Activate project: mcp_serena_activate_project
2. Check onboarding: mcp_serena_check_onboarding_performed
3. Read manual: mcp_serena_initial_instructions (once per session)
4. Use symbolic tools:
   - get_symbols_overview: File overview
   - find_symbol: Find by name/pattern
   - read_file: Read file contents
   - replace_content: Regex-based edits
   - replace_symbol_body: Replace entire symbols
   - execute_shell_command: Run commands
```

### 3. Symbolic Editing Best Practices

**Rule**: Use symbol-level tools for large changes, regex for small edits.

```typescript
// ✅ Symbol-level: Replacing entire method
mcp_serena_replace_symbol_body({
  name_path: "TaskStore/createAsync",
  body: "/* new implementation */"
});

// ✅ Regex: Small edits within a method
mcp_serena_replace_content({
  mode: "regex",
  needle: "const status = .*?;",
  repl: "const status = request.status ?? 'pending';"
});
```

### 4. Efficient Information Gathering

**Rule**: Use symbolic tools to minimize token usage.

```typescript
// ❌ Inefficient: Read entire large file
mcp_serena_read_file({ relative_path: "src/large-file.ts", start_line: 1, end_line: 1000 });

// ✅ Efficient: Get overview first
mcp_serena_get_symbols_overview({ relative_path: "src/large-file.ts", depth: 1 });

// Then read only what you need:
mcp_serena_find_symbol({
  name_path_pattern: "MyClass/myMethod",
  include_body: true
});
```

---

## Educational Approach

### 1. Pattern Explanation After Implementation

**Rule**: After completing each major task or feature, provide:

1. **Pattern Name**: What design pattern was used
2. **Why It Matters**: Benefits and trade-offs
3. **Real-World Examples**: How it applies elsewhere
4. **Anti-patterns**: Common mistakes to avoid
5. **References**: Links to further reading

**Example Template**:

```markdown
## Pattern: [Pattern Name]

**What we implemented**: [Brief description]

**Why this pattern**:
- ✅ Benefit 1
- ✅ Benefit 2

**Trade-offs**:
- ⚠️ Consideration 1

**Real-world use cases**:
1. Example 1
2. Example 2

**Anti-patterns to avoid**:
- ❌ Don't do this
- ✅ Do this instead
```

### 2. Code Review Checklist

After each implementation, review:

- [ ] **DRY**: No duplicated code/types
- [ ] **Type Safety**: Explicit types, no `any`
- [ ] **Security**: Input validation, bounds checking
- [ ] **Immutability**: No mutations, use copies
- [ ] **Error Handling**: Try-catch where needed
- [ ] **Testing**: Comprehensive test coverage
- [ ] **Documentation**: JSDoc comments on public APIs
- [ ] **Patterns**: Following established patterns

### 3. Progressive Learning

**Rule**: Build complexity gradually with clear explanations.

1. **Foundation**: Start with simple CRUD operations
2. **Intermediate**: Add validation, error handling
3. **Advanced**: Implement patterns (Observer, Repository)
4. **Expert**: Optimize for performance, scale

---

## Comments & Documentation

### 1. JSDoc for Public APIs

**Rule**: All exported functions/classes/interfaces need JSDoc.

```typescript
/**
 * Request to create a new task
 */
export interface TaskCreateRequest {
  /** Task name (required, 1-500 chars) */
  name: string;
  /** Detailed description (max 5000 chars) */
  description: string;
}

/**
 * Create a new task
 *
 * @param request - Task creation data
 * @returns Newly created task with generated ID and timestamps
 * @throws {ZodError} If validation fails
 */
public async createAsync(request: TaskCreateRequest): Promise<TaskItem>
```

### 2. Inline Comments for Intent

**Rule**: Explain WHY, not WHAT (code shows what). Avoid OWASP control references in inline comments.

```typescript
// ✅ GOOD: Explains reasoning
// Safe: index validated above
const existing = document.tasks[index]!;

// Schema defaults ensure arrays are never undefined, but TypeScript needs assertion
return document as TaskDocument;

// Don't let handler errors break the store
console.error('Error in task change handler:', error);

// Validate query length to prevent ReDoS
if (query.length > MAX_LENGTH) throw new Error('Query too long');

// ❌ BAD: Repeats what code says
// Get the task at index
const existing = document.tasks[index];

// ❌ BAD: OWASP references in inline comments (use JSDoc instead)
// C5: Validate input
// C10: Handle errors securely
```

**Note**: Document security controls (OWASP C1-C10) in:
- Class-level JSDoc comments
- Function-level JSDoc comments for security-critical methods
- Architecture documentation (README, design docs)

Do NOT use inline `// C5:` or `// C10:` style comments - they clutter code.

### 3. TODO Comments with Context

**Rule**: Include context and tracking information.

```typescript
// ✅ GOOD
// TODO: Implement backup functionality when MemoryStore is available
// For now, just clear tasks

// ❌ BAD
// TODO: Fix this later
```

---

## Summary Checklist

Before committing code, verify:

- [ ] **Types**: All interfaces/types follow DRY, arrays use `Type[]` syntax
- [ ] **Validation**: Zod schemas validate all inputs
- [ ] **Immutability**: Using spread operators, no mutations
- [ ] **Async**: Methods named with `Async` suffix
- [ ] **Nullability**: Explicit `| null` where needed
- [ ] **Error Handling**: Try-catch for external operations
- [ ] **Testing**: Comprehensive tests with isolation
- [ ] **Security**: Bounds checking, input validation
- [ ] **Patterns**: Following Repository, Observer, Pure Functions
- [ ] **Documentation**: JSDoc on public APIs, intent comments on complex logic
- [ ] **Serena**: Using appropriate MCP tools efficiently

---

## References

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **Zod Documentation**: https://zod.dev/
- **Design Patterns**: Gang of Four (Observer, Repository)
- **Functional Programming**: Immutability, Pure Functions
- **SOLID Principles**: Single Responsibility, Open/Closed, etc.
