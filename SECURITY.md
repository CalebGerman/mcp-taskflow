# Security Documentation

## Threat Model

### Trust Boundaries

```
MCP Client (VS Code/Claude Desktop) ←→ MCP Server (TypeScript) ←→ File System (.mcp-tasks/)
        Untrusted Input                   Validation Layer           Protected Resources
```

### Threat Actors

1. **Malicious MCP Clients**: Could send crafted requests with path traversal, oversized inputs, or injection attacks
2. **Compromised File Paths**: User-controlled paths attempting to escape `.mcp-tasks/` directory
3. **Untrusted User Input**: Task names, descriptions, and metadata that could contain malicious content

### Attack Vectors

#### 1. Path Traversal (CRITICAL)

**Attack**: Client sends file path like `../../etc/passwd` or `..\..\Windows\System32\config\SAM`
**Mitigation**:

- Resolve all paths with `path.resolve()`
- Validate paths start with `DATA_DIR`
- Reject any path outside allowed directory

#### 2. Input Injection

**Attack**: Oversized task names (DoS), special characters in JSON, malformed GUIDs
**Mitigation**:

- Zod schemas validate ALL inputs
- Max length checks (name: 500 chars, description: 5000 chars)
- GUID format validation for task IDs

#### 3. JSON Deserialization Attacks

**Attack**: Malformed JSON, schema version mismatches, prototype pollution
**Mitigation**:

- Schema version validation before processing
- Migration logic for old versions
- Zod parsing (rejects unexpected fields)

#### 4. Denial of Service

**Attack**: Creating millions of tasks, infinite loops, file exhaustion
**Mitigation**:

- Input size limits (Zod max length)
- File count monitoring (future enhancement)
- Graceful error handling

## Security Requirements

### Authentication & Authorization

**Authentication**: NOT APPLICABLE

- MCP server runs locally via STDIO
- Single-user context (trust local user)

**Authorization**: File System Access Control

- REQUIRED: All file operations constrained to `DATA_DIR`
- REQUIRED: Path sanitization before ANY file I/O
- REQUIRED: No access to parent directories

### Input Validation

**ALL tool parameters MUST be validated with Zod schemas:**

```typescript
// Example: Task creation
const CreateTaskSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(5000),
  dependencies: z.array(z.string()).optional(),
});

// Validation in tool
const validated = CreateTaskSchema.parse(params); // Throws on invalid
```

**Validation Rules**:

- Type validation (string, number, boolean, array)
- Length validation (min/max)
- Format validation (GUID, enum values)
- Business logic validation (status transitions)

### Secret Management

**FORBIDDEN**: Hardcoded secrets in code or JSON files
**REQUIRED**: Environment variables ONLY

```typescript
// ✅ Correct
const dataDir = process.env.DATA_DIR || '.mcp-tasks';

// ❌ Forbidden
const apiKey = 'sk-1234567890abcdef';
```

### Error Handling

**User-Facing Errors**: Generic messages ONLY
**Server Logs**: Detailed error context

```typescript
try {
  return await taskStore.getById(taskId);
} catch (error) {
  logger.error({ error, taskId }, 'Failed to retrieve task');
  throw new Error('Task not found. Please verify the task ID.');
  // ❌ Never return: error.message, error.stack, file paths
}
```

### Logging

**REQUIRED**: Log security events

- Path validation failures
- Input validation failures
- File operation errors

**FORBIDDEN**: Log sensitive data

- Task content (may contain PII)
- File paths (may reveal internal structure)
- Stack traces (in user-facing messages)

## Data Protection

### Data at Rest

**Encryption**: NOT REQUIRED

- Local file system (user's machine)
- OS-level encryption (BitLocker, FileVault)

### Data in Transit

**Encryption**: NOT APPLICABLE

- STDIO communication (local process)
- No network transmission

### Data Retention

**Snapshots**: Completed tasks archived to `memory/` directory
**Backups**: Created before destructive operations (clear_all_tasks)
**Cleanup**: User responsibility (no auto-deletion)

## Compliance

### Security Controls Mapping

#### **C1: Define Security Requirements** ⚠️ HIGHEST PRIORITY

**Status**: ✅ IMPLEMENTED

- Documented threat model and attack vectors (above)
- Created abuse cases (path traversal, injection, DoS)
- Attack surface analysis complete
- Security requirements defined for each tool

**Implementation**:

- This SECURITY.md document
- Security-focused architecture decisions
- ESLint security rules enforced

#### **C2: Leverage Security Frameworks and Libraries**

**Status**: ✅ IMPLEMENTED

- Using `zod` v3.22.4 for input validation (industry-standard)
- Using `@modelcontextprotocol/sdk` v1.0.2 (official MCP implementation)
- Using `pino` v8.17.2 for structured logging
- All dependencies tracked and audited via `pnpm audit`

**Why NOT Custom**:

- ❌ No custom crypto (none needed for local STDIO)
- ❌ No custom validation (Zod handles all)
- ❌ No custom serialization (JSON.parse with Zod validation)

#### **C3: Secure Database Access**

**Status**: ✅ IMPLEMENTED (JSON file storage)

- NO SQL/NoSQL database (JSON files only)
- Schema validation prevents injection via Zod
- Atomic file operations prevent corruption
- No dynamic query construction

**Safe Patterns**:

```typescript
// ✅ Type-safe, no injection possible
const task = taskDocument.tasks.find(t => t.id === validatedId);
```

#### **C4: Encode and Escape Data**

**Status**: ⚠️ PARTIAL (templates pending)

- JSON serialization: Native `JSON.stringify()` (safe)
- Markdown templates: Will use Handlebars (auto-escaping)
- Log output: Pino sanitizes sensitive data

**TODO**:

- Implement template engine with auto-escaping (Task 12)
- Add log sanitization for PII

#### **C5: Validate All Inputs** ⚠️ CRITICAL

**Status**: ✅ IMPLEMENTED

- **ALL 19 MCP tool parameters** validated with Zod schemas
- Server-side validation ONLY (no client-side trust)
- Type, length, range, format checks enforced
- Allowlist validation for enums (status, update mode)

**Coverage**:

- HTTP params: N/A (STDIO only)
- Tool parameters: 100% (19/19 tools)
- File inputs: Zod validation on read
- External APIs: N/A (no external calls)

**Example**:

```typescript
// CreateTaskParamsSchema validates:
// - name: 1-500 chars (prevents DoS)
// - description: max 5000 chars
// - taskId: UUID format (prevents injection)
```

#### **C6: Implement Digital Identity**

**Status**: ❌ NOT APPLICABLE

- Local STDIO execution (no network authentication)
- Single-user context (trusts local OS user)
- No password storage or session management needed

**Future Consideration**:

- If MCP server becomes networked: implement OAuth 2.0 + PKCE

#### **C7: Enforce Access Controls** ⚠️ CRITICAL

**Status**: ✅ IMPLEMENTED

- **Path traversal prevention** (pathResolver.ts)
- All file operations constrained to `DATA_DIR`
- Path sanitization before ANY fs operations
- No access to parent directories or system files

**Implementation**:

```typescript
// pathResolver.ts
function sanitizePath(userPath: string): string {
  const resolved = path.resolve(DATA_DIR, userPath);
  if (!resolved.startsWith(DATA_DIR)) {
    throw new SecurityError('Path traversal detected');
  }
  return resolved;
}
```

**Test Coverage**:

- `../../etc/passwd` → REJECTED
- `..\..\Windows\System32` → REJECTED
- Symbolic links → REJECTED
- Absolute paths outside DATA_DIR → REJECTED

#### **C8: Protect Data Everywhere**

**Status**: ⚠️ PARTIAL

- **TLS**: N/A (local STDIO, no network)
- **Encryption at rest**: User responsibility (OS-level BitLocker/FileVault)
- **Secret management**: Environment variables ONLY
- **Logging**: NO PII, passwords, or sensitive task content

**Implementation**:

```typescript
// ✅ Safe
const dataDir = process.env.DATA_DIR || '.mcp-tasks';

// ❌ Forbidden
logger.info({ taskName: task.name }); // May contain PII
```

**TODO**:

- Add log sanitization middleware (Task 9)
- Document OS-level encryption recommendations

#### **C9: Implement Security Logging and Monitoring**

**Status**: ✅ IMPLEMENTED

- Structured logging with Pino
- Correlation IDs for request tracing
- Security event logging (validation failures, path violations)

**Logged Events**:

- ✅ Authentication events: N/A (local execution)
- ✅ Authorization failures: Path traversal attempts
- ✅ Input validation failures: Zod schema rejections
- ✅ Admin actions: clear_all_tasks, delete_task
- ⚠️ Sensitive data access: TODO (task query operations)

**NOT Logged**:

- ❌ Task content (may contain PII)
- ❌ Full file paths (information disclosure)
- ❌ Stack traces (in production logs)

#### **C10: Handle All Errors and Exceptions Securely**

**Status**: ✅ IMPLEMENTED

- **User errors**: Generic messages ("Task not found")
- **Server logs**: Detailed context (task ID, operation, stack trace)
- **Fail securely**: Reject operation on error (no partial state)

**Pattern**:

```typescript
try {
  const task = await taskStore.getById(taskId);
  return task;
} catch (error) {
  // ✅ Detailed server log
  logger.error({ error, taskId }, 'Failed to retrieve task');

  // ✅ Generic user message (no internal details)
  throw new Error('Task not found. Please verify the task ID.');

  // ❌ NEVER expose: error.message, stack, file paths, SQL queries
}
```

**Security Boundaries**:

- Internal errors → Logged + Generic message
- Validation errors → Specific (safe schema error)
- System errors → Logged + "An error occurred"

## Security Testing

### Test Coverage Requirements

- ✅ Path sanitization (prevent directory traversal)
- ✅ Input validation (Zod schema rejection)
- ✅ Error handling (no stack trace leaks)
- ✅ Schema migration (backward compatibility)

### Vulnerability Scanning

```bash
# Run before every commit
npm audit --audit-level=moderate
```

## Incident Response

### Security Issue Reporting

**Contact**: File GitHub issue with `[SECURITY]` prefix
**Response Time**: Best effort (educational project)

### Known Limitations

1. **No rate limiting**: Local STDIO, not needed
2. **No authentication**: Single-user local context
3. **No encryption**: Local files, OS-level encryption recommended

## Security Updates

**Last Updated**: 2026-01-18
**Review Frequency**: Before major releases
**Responsible**: Project maintainers
