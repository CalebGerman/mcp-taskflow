# AI Agent Quick Reference - MCP Task and Research Manager

**For**: AI coding agents working on this TypeScript project  
**Purpose**: Quick reference to maintain consistency and prevent context rot

---

## Critical Rules (Must Follow)

### 1. Tool Usage
- **Always use Serena MCP tools** for code operations (`mcp_serena_*`)
- **Read `TYPESCRIPT_CODING_STANDARDS.md`** at session start
- **Activate project** before using Serena tools

### 2. Code Standards
- **DRY**: Extract duplicated types immediately, use utility types (Pick, Omit, Partial)
- **Type Safety**: Use `Type[]` not `Array<Type>`, explicit nullability (`| null`)
- **Immutability**: Spread operators, never mutate
- **Validation**: Zod schemas for all external inputs
- **Comments**: NO OWASP references in inline comments (e.g., `// C5:`). Use JSDoc for security documentation.

### 3. After Each Implementation
**MUST provide educational explanation**:
1. Pattern name used
2. Why it matters (benefits/trade-offs)
3. Real-world examples
4. Anti-patterns to avoid

---

## Quick Commands

### Project Setup
```typescript
// 1. Activate project
mcp_serena_activate_project({ project: "e:\\GIT\\mcp-task-and-research\\mcp-task-and-research-ts" })

// 2. Check onboarding
mcp_serena_check_onboarding_performed()

// 3. Read standards
mcp_serena_read_file({ relative_path: "TYPESCRIPT_CODING_STANDARDS.md" })
```

### Code Reading
```typescript
// Overview first (efficient)
mcp_serena_get_symbols_overview({ relative_path: "src/file.ts", depth: 1 })

// Then specific symbols
mcp_serena_find_symbol({ 
  name_path_pattern: "ClassName/methodName",
  include_body: true 
})
```

### Code Editing
```typescript
// Small edits: Use regex
mcp_serena_replace_content({
  mode: "regex",
  needle: "pattern.*?to.*?match",
  repl: "replacement"
})

// Large edits: Replace symbol
mcp_serena_replace_symbol_body({
  name_path: "ClassName/methodName",
  body: "/* new implementation */"
})
```

### Testing & Validation
```typescript
// Run tests
mcp_serena_execute_shell_command({ command: "pnpm test" })

// Type check
mcp_serena_execute_shell_command({ command: "pnpm run type-check" })

// Lint
mcp_serena_execute_shell_command({ command: "pnpm run lint" })
```

---

## Code Patterns to Follow

### Pattern 1: CRUD Operations
```typescript
// 1. READ current state
const document = await this.readDocumentAsync();

// 2. VALIDATE preconditions
if (index < 0) return null;

// 3. MODIFY immutably
const updated = { ...existing, ...changes };

// 4. WRITE atomically
await this.writeDocumentAsync(updatedDocument);

// 5. NOTIFY subscribers (Observer pattern)
this.notifyHandlers({ type: 'updated', task: updated });
```

### Pattern 2: Type Definitions
```typescript
// Extract duplicated types
type MyType = 'A' | 'B' | 'C';

// Use utility types to derive types (DRY)
type CreatableFields = Pick<Item, 'name' | 'description' | 'notes'>;
type UpdatableFields = Partial<Pick<Item, 'name' | 'status'>>;

export interface CreateRequest extends CreatableFields {
  dependencies?: string[];
}

export interface UpdateRequest extends UpdatableFields {
  dependencies?: string[] | null;
}

export interface MyInterface {
  field: MyType;  // DRY
  array: string[];  // Not Array<string>
  nullable: string | null;  // Explicit null
  optional?: string | null;  // Can be undefined OR null
}
```

### Pattern 3: Event Handling
```typescript
// Observer Pattern
export type ChangeEvent =
  | { type: 'created'; data: Item }
  | { type: 'updated'; data: Item };

// Emit AFTER success
await atomicWrite();
this.notifyHandlers({ type: 'created', data });
```

---

## Testing Standards

### Test Structure
```typescript
describe('Feature', () => {
  let tempDir: string;
  let store: Store;
  
  beforeEach(() => {
    // Unique isolation per test
    tempDir = `${os.tmpdir()}/test-${Date.now()}-${Math.random()}`;
    store = new Store(tempDir);
  });
  
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  test('should handle happy path', async () => {
    // Arrange
    const input = { ... };
    
    // Act
    const result = await store.method(input);
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### Coverage Requirements
- ✅ All CRUD operations
- ✅ Edge cases (not found, empty, null)
- ✅ Validation failures
- ✅ Business logic
- ✅ Event notifications

---

## Security Checklist

- [ ] Input validation with Zod schemas
- [ ] Array bounds checking before access
- [ ] No string interpolation with user input
- [ ] Length limits on strings (DoS protection)
- [ ] Error isolation (try-catch on user code)
- [ ] No secrets in code (use environment variables)

---

## Educational Template

After implementing a feature, provide:

```markdown
## ✅ [Feature Name] Complete

### Pattern Used: [Pattern Name]

**What it does**: [Brief description]

**Why this pattern**:
- ✅ Benefit 1
- ✅ Benefit 2

**Trade-offs**:
- ⚠️ Consideration 1

**Real-world examples**:
1. Example 1
2. Example 2

**Common mistakes**:
- ❌ Anti-pattern
- ✅ Correct approach

**Further reading**: [Links]
```

---

## Pre-Commit Checklist

Before marking a task complete:

- [ ] Code follows `TYPESCRIPT_CODING_STANDARDS.md`
- [ ] All tests passing (`pnpm test`)
- [ ] Type check passing (`pnpm run type-check`)
- [ ] Lint passing (`pnpm run lint`)
- [ ] DRY: No duplicated types/code
- [ ] Security: Input validation, bounds checking
- [ ] Documentation: JSDoc on public APIs
- [ ] Educational explanation provided

---

## Common ESLint Warnings (Can Ignore)

```typescript
// security/detect-object-injection - False positive when bounds checked
const index = this.findIndex(tasks, id);
if (index < 0) return null;  // ✅ Validated
const item = tasks[index]!;   // ⚠️ Warning is false positive
```

---

## File Organization Priority

1. Read `TYPESCRIPT_CODING_STANDARDS.md`
2. Review `README.md` for project overview
3. Check task list for current work
4. Use Serena tools to explore codebase symbolically
5. Implement following patterns
6. Test thoroughly
7. Provide educational explanation
8. Update documentation

---

## Quick Test Commands

```bash
# All tests
pnpm test

# Specific file
pnpm test taskStore

# With coverage
pnpm test --coverage

# Type check only
pnpm run type-check

# Lint only
pnpm run lint

# Build
pnpm run build
```

---

## Remember

1. **Use Serena tools** for all code operations
2. **Follow established patterns** (Repository, Observer, DRY)
3. **Educate after implementing** (pattern explanation)
4. **Test comprehensively** (isolated tests)
5. **Validate security** (Zod, bounds checking)
6. **Keep context fresh** (read standards each session)

**Success = Working code + Educational value + Pattern adherence**
