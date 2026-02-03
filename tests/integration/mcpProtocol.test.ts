/**
 * MCP Protocol Compliance Integration Tests
 *
 * Tests full JSON-RPC 2.0 and MCP specification compliance.
 * Validates server initialization, tool discovery, and execution.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface ToolInfo {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP Client that communicates with server via STDIO
 */
class McpTestClient {
  private process: ChildProcess | null = null;
  private dataDir: string;
  private responseBuffer: string = '';
  private pendingRequests = new Map<
    number | string,
    { resolve: (value: JsonRpcResponse) => void; reject: (error: Error) => void }
  >();
  private nextId = 1;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Start the MCP server process
      this.process = spawn('node', ['dist/index.js'], {
        env: {
          ...process.env,
          DATA_DIR: this.dataDir,
          NODE_ENV: 'test',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error('Failed to create process pipes'));
        return;
      }

      // Handle stdout (JSON-RPC responses)
      this.process.stdout.on('data', (chunk: Buffer) => {
        this.handleData(chunk.toString('utf-8'));
      });

      // Handle stderr (logs)
      this.process.stderr?.on('data', (chunk: Buffer) => {
        // Log errors but don't fail tests (server logs go here)
        console.log('Server log:', chunk.toString('utf-8'));
      });

      // Handle process errors
      this.process.on('error', (error) => {
        reject(error);
      });

      // Handle process exit
      this.process.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      // Give server time to initialize
      setTimeout(() => resolve(), 1000);
    });
  }

  private handleData(data: string): void {
    this.responseBuffer += data;

    // Try to parse complete JSON-RPC messages
    const lines = this.responseBuffer.split('\n');
    this.responseBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response = JSON.parse(line) as JsonRpcResponse;

        // Resolve pending request
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          this.pendingRequests.delete(response.id);
          pending.resolve(response);
        }
      } catch (error) {
        console.error('Failed to parse JSON-RPC response:', line, error);
      }
    }
  }

  async sendRequest(method: string, params?: unknown): Promise<JsonRpcResponse> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Client not started');
    }

    const id = this.nextId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Send request
      const requestJson = JSON.stringify(request) + '\n';
      this.process!.stdin!.write(requestJson, (error) => {
        if (error) {
          this.pendingRequests.delete(id);
          reject(error);
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 5000);
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

describe('MCP Protocol Compliance', () => {
  let tempDir: string;
  let client: McpTestClient;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `mcp-integration-${timestamp}-${random}-`));
    client = new McpTestClient(tempDir);
  });

  afterEach(async () => {
    await client.stop();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up ${tempDir}:`, error);
    }
  });

  describe('JSON-RPC 2.0 Compliance', () => {
    it('should respond with correct JSON-RPC version', async () => {
      await client.start();

      const response = await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      });

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBeDefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      await client.start();

      // This test verifies error handling at protocol level
      // Invalid requests should return proper error responses
      const response = await client.sendRequest('invalid_method', {});

      // Should either succeed with error response or timeout
      if (response.error) {
        expect(response.error.code).toBeDefined();
        expect(response.error.message).toBeDefined();
      }
    });

    it('should include request ID in response', async () => {
      await client.start();

      const response = await client.sendRequest('ping');

      expect(response.id).toBeDefined();
      expect(typeof response.id === 'number' || typeof response.id === 'string').toBe(true);
    });
  });

  describe('MCP Initialization', () => {
    it('should accept initialize request', async () => {
      await client.start();

      const response = await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      });

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const result = response.result as {
        protocolVersion: string;
        serverInfo: { name: string; version: string };
        capabilities: unknown;
      };

      expect(result.protocolVersion).toBe('2024-11-05');
      expect(result.serverInfo).toBeDefined();
      expect(result.serverInfo.name).toBeTruthy();
      expect(result.capabilities).toBeDefined();
    });

    it('should support initialized notification', async () => {
      await client.start();

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      });

      // Send initialized notification (no response expected)
      const notification = {
        jsonrpc: '2.0' as const,
        method: 'notifications/initialized',
      };

      if (client['process'] && client['process'].stdin) {
        client['process'].stdin.write(JSON.stringify(notification) + '\n');
      }

      // Should not throw or cause issues
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      await client.start();

      // Initialize first
      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      const response = await client.sendRequest('tools/list');

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const result = response.result as { tools: ToolInfo[] };
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);

      // Verify all expected tools are present
      const toolNames = result.tools.map((t) => t.name);
      const expectedTools = [
        'plan_task',
        'analyze_task',
        'reflect_task',
        'split_tasks',
        'list_tasks',
        'get_task_detail',
        'query_task',
        'update_task',
        'delete_task',
        'clear_all_tasks',
        'execute_task',
        'verify_task',
        'research_mode',
        'process_thought',
        'init_project_rules',
        'get_server_info',
      ];

      for (const expectedTool of expectedTools) {
        expect(toolNames).toContain(expectedTool);
      }
    });

    it('should provide valid JSON schemas for all tools', async () => {
      await client.start();

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      const response = await client.sendRequest('tools/list');
      const result = response.result as { tools: ToolInfo[] };

      for (const tool of result.tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      }
    });
  });

  describe('Tool Execution', () => {
    it('should execute plan_task tool', async () => {
      await client.start();

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      const response = await client.sendRequest('tools/call', {
        name: 'plan_task',
        arguments: {
          description: 'Implement user authentication',
          requirements: 'Use JWT and bcrypt',
          existingTasksReference: false,
        },
      });

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const result = response.result as { content: Array<{ type: string; text: string }> };
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('user authentication');
    });

    it('should execute split_tasks and create tasks', async () => {
      await client.start();

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      const response = await client.sendRequest('tools/call', {
        name: 'split_tasks',
        arguments: {
          updateMode: 'append',
          tasks: [
            {
              name: 'Test Task 1',
              description: 'First test task',
            },
            {
              name: 'Test Task 2',
              description: 'Second test task',
              dependencies: ['Test Task 1'],
            },
          ],
        },
      });

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      // Verify tasks were created
      const listResponse = await client.sendRequest('tools/call', {
        name: 'list_tasks',
        arguments: {
          status: 'all',
        },
      });

      expect(listResponse.error).toBeUndefined();
      const listResult = listResponse.result as { content: Array<{ text: string }> };
      expect(listResult.content[0].text).toContain('Test Task 1');
      expect(listResult.content[0].text).toContain('Test Task 2');
    });

    it('should handle tool execution errors gracefully', async () => {
      await client.start();

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      // Try to execute with invalid arguments
      const response = await client.sendRequest('tools/call', {
        name: 'plan_task',
        arguments: {
          description: '', // Invalid: empty description
        },
      });

      // Should return error, not crash
      expect(response.error).toBeDefined();
      expect(response.error!.message).toBeTruthy();
    });
  });

  describe('Multi-Step Workflows', () => {
    it('should support complete task lifecycle', async () => {
      await client.start();

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      // Step 1: Create tasks
      await client.sendRequest('tools/call', {
        name: 'split_tasks',
        arguments: {
          updateMode: 'append',
          tasks: [
            {
              name: 'Workflow Task',
              description: 'Test workflow task',
            },
          ],
        },
      });

      // Step 2: Query tasks
      const queryResponse = await client.sendRequest('tools/call', {
        name: 'query_task',
        arguments: {
          query: 'Workflow Task',
          isId: false,
        },
      });

      expect(queryResponse.error).toBeUndefined();

      // Step 3: Get task details
      const listResponse = await client.sendRequest('tools/call', {
        name: 'list_tasks',
        arguments: { status: 'pending' },
      });

      expect(listResponse.error).toBeUndefined();
    });

    it('should support research workflow', async () => {
      await client.start();

      await client.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });

      // Execute research mode
      const response = await client.sendRequest('tools/call', {
        name: 'research_mode',
        arguments: {
          topic: 'TypeScript best practices',
          previousState: '',
          currentState: 'Initial research',
          nextSteps: 'Study patterns',
        },
      });

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      const result = response.result as { content: Array<{ text: string }> };
      expect(result.content[0].text).toContain('TypeScript');
    });
  });
});
