# Integration Tests

This directory contains end-to-end integration tests for the MCP Task and Research server.

## Test Suites

### 1. MCP Protocol Compliance (`mcpProtocol.test.ts`)

Tests the server's compliance with the Model Context Protocol specification and JSON-RPC 2.0.

**Coverage:**
- ✅ JSON-RPC 2.0 message format validation
- ✅ MCP initialization handshake
- ✅ Tool discovery (`tools/list`)
- ✅ Tool execution (`tools/call`)
- ✅ Error handling and edge cases
- ✅ Multi-step workflows

**Key Tests:**
- `should respond with correct JSON-RPC version` - Validates protocol version
- `should accept initialize request` - Tests MCP initialization
- `should list all available tools` - Verifies all 16+ tools are registered
- `should execute plan_task tool` - Tests end-to-end tool execution

**Usage:**
```bash
# Run protocol tests only
pnpm test tests/integration/mcpProtocol.test.ts

# Run with verbose output
pnpm test tests/integration/mcpProtocol.test.ts -- --reporter=verbose
```

### 2. Performance Tests (`performance.test.ts`)

Benchmarks server performance under various load conditions.

**Coverage:**
- ✅ Large dataset handling (1000+ tasks)
- ✅ Concurrent request processing
- ✅ Memory leak detection
- ✅ Response time benchmarks
- ✅ Sustained load testing

**Key Metrics:**
- Task creation: < 10 seconds for 1000 tasks
- Query performance: < 1 second with 1000 tasks
- Simple queries: < 10ms average response time
- Memory growth: < 10MB after 100 operations

**Usage:**
```bash
# Run performance tests
pnpm test tests/integration/performance.test.ts

# Run with coverage
pnpm test:coverage tests/integration/performance.test.ts
```

### 3. End-to-End Workflows (`workflows.test.ts`)

Simulates realistic AI assistant usage patterns across complete workflows.

**Workflows Tested:**
- ✅ Complete project planning (plan → analyze → split → execute → verify)
- ✅ Research and documentation workflow
- ✅ Task lifecycle management (create → update → complete → delete)
- ✅ Task search and filtering
- ✅ Data persistence across restarts
- ✅ Error recovery

**Example Workflow:**
```typescript
1. plan_task() → Get planning guidance
2. analyze_task() → Deep analysis
3. split_tasks() → Create subtasks with dependencies
4. execute_task() → Start execution
5. verify_task() → Complete and score task
```

**Usage:**
```bash
# Run workflow tests
pnpm test tests/integration/workflows.test.ts

# Watch mode for development
pnpm test:watch tests/integration/workflows.test.ts
```

## Running All Integration Tests

```bash
# Run all integration tests
pnpm test tests/integration/

# Run with coverage report
pnpm test:coverage -- tests/integration/

# Run in watch mode (development)
pnpm test:watch tests/integration/
```

## Test Environment

Integration tests use **isolated temporary directories** for each test to ensure:
- No cross-test contamination
- Safe parallel execution
- Automatic cleanup after tests

Each test creates a unique temp directory:
```
/tmp/mcp-integration-{timestamp}-{random}/
  └── tasks.json
  └── memory/
  └── taskflow-rules.md
```

## Performance Baselines

Acceptance criteria for performance tests:

| Metric | Target | Maximum |
|--------|--------|---------|
| 1000 task creation | 5s | 10s |
| Query 1000 tasks | 500ms | 1s |
| Simple tool call | 5ms | 10ms |
| Memory per 100 ops | 5MB | 10MB |
| Concurrent 10 calls | 2s | 5s |

## MCP Client Compatibility

These tests validate compatibility with real MCP clients:

- **Claude Desktop** - Anthropic's official MCP client
- **Cline (formerly Claude Dev)** - VS Code extension
- **mcp-inspector** - MCP protocol debugging tool

To test with a real MCP client:

1. Build the server:
   ```bash
   pnpm build
   ```

2. Configure your MCP client to use the server:
   ```json
   {
     "mcpServers": {
       "taskflow": {
         "command": "node",
         "args": ["/path/to/dist/index.js"],
         "env": {
           "DATA_DIR": "./.mcp-tasks"
         }
       }
     }
   }
   ```

3. Test tool discovery and execution through the client UI

## Debugging Integration Tests

### Enable Debug Logging

Set environment variable before running tests:
```bash
DEBUG=mcp:* pnpm test tests/integration/
```

### Inspect Test Artifacts

Prevent cleanup to inspect generated files:
```typescript
afterEach(async () => {
  // Comment out cleanup for debugging
  // await fs.rm(tempDir, { recursive: true, force: true });
  console.log('Test data preserved at:', tempDir);
});
```

### Run Single Test

```bash
# Run specific test by name
pnpm test tests/integration/workflows.test.ts -t "should support full planning"
```

## CI/CD Integration

Integration tests are run in CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  run: |
    pnpm build
    pnpm test tests/integration/
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Comparing with the reference implementation

The TypeScript integration tests mirror the reference test structure:

| Reference | TypeScript |
|----|------------|
| `McpServerTests.cs` | `mcpProtocol.test.ts` |
| `PerformanceTests.cs` | `performance.test.ts` |
| `IntegrationTests.cs` | `workflows.test.ts` |
| xUnit framework | Vitest framework |
| TempDirectory helper | fs.mkdtemp() |
| ITestOutputHelper | console.log() |

## Security Testing

See `../security/` for dedicated security tests including:
- Input validation fuzzing
- Path traversal prevention
- Injection attack prevention
- Error message sanitization

## Contributing

When adding new integration tests:

1. ✅ Use isolated temp directories
2. ✅ Clean up resources in afterEach()
3. ✅ Test both success and error cases
4. ✅ Include performance assertions where relevant
5. ✅ Document expected behavior in test names
6. ✅ Follow existing test patterns

## Troubleshooting

### Tests Timeout

Increase timeout in vitest.config.ts:
```typescript
test: {
  testTimeout: 30000, // 30 seconds
}
```

### Port Conflicts

Integration tests use STDIO (no network ports), so conflicts are rare.

### File Permission Errors

Ensure write permissions for temp directory:
```bash
chmod -R 755 /tmp
```

### Memory Issues

Run tests with increased heap:
```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm test tests/integration/
```

## Next Steps

After integration tests pass:

1. ✅ Run security tests (`../security/`)
2. ✅ Test with real MCP clients (Claude Desktop, Cline)
3. ✅ Benchmark against the reference implementation
4. ✅ Deploy to staging environment
5. ✅ Perform user acceptance testing
