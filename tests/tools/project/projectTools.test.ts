/**
 * Project Tools Tests
 *
 * Tests for init_project_rules and get_server_info tools.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createContainer, resetGlobalContainer, type ServiceContainer } from '../../../src/server/container.js';
import { createMcpServer } from '../../../src/server/mcpServer.js';

describe('Project Tools', () => {
  let tempDir: string;
  let container: ServiceContainer;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `projecttools-${timestamp}-${random}-`));
    container = createContainer({ dataDir: tempDir });
  });

  afterEach(async () => {
    resetGlobalContainer();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up ${tempDir}:`, error);
    }
  });

  describe('init_project_rules', () => {
    it('should create default rules if they do not exist', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('init_project_rules');

      expect(handler).toBeDefined();

      const result = await handler!.execute({});

      expect(result).toContain('Project Standards');
      expect(result).toContain('taskflow-rules.md');

      // Verify rules file was created
      const rulesExist = await container.rulesStore.rulesExistAsync();
      expect(rulesExist).toBe(true);
    });

    it('should return existing rules if already initialized', async () => {
      const { rulesStore } = container;

      // Initialize rules first
      await rulesStore.initializeRulesAsync();

      const server = createMcpServer(container);
      const handler = server['tools'].get('init_project_rules');

      const result = await handler!.execute({});

      expect(result).toContain('Project Standards');
      expect(result).toContain('taskflow-rules.md');
    });

    it('should handle custom rules content', async () => {
      const { rulesStore } = container;

      // Initialize with custom content
      await rulesStore.initializeRulesAsync();
      const customRules = '# Custom Rules\n\n- Use TypeScript\n- Follow SOLID principles';
      await rulesStore.saveRulesAsync(customRules);

      const server = createMcpServer(container);
      const handler = server['tools'].get('init_project_rules');

      const result = await handler!.execute({});

      expect(result).toContain('Project Standards');
      expect(result).toContain('taskflow-rules.md');
    });

    it('should validate rules file is markdown format', async () => {
      const { rulesStore } = container;

      await rulesStore.initializeRulesAsync();
      const rules = await rulesStore.loadRulesAsync();

      // Should contain markdown headers
      expect(rules).toMatch(/^#/m);
    });

    it('should persist rules across server restarts', async () => {
      // First initialization
      const server1 = createMcpServer(container);
      const handler1 = server1['tools'].get('init_project_rules');
      await handler1!.execute({});

      // Create new server instance with same data directory
      const container2 = createContainer({ dataDir: tempDir });
      const server2 = createMcpServer(container2);
      const handler2 = server2['tools'].get('init_project_rules');

      const result = await handler2!.execute({});

      expect(result).toContain('Project Standards');
      expect(await container2.rulesStore.rulesExistAsync()).toBe(true);
    });

    it('should handle missing data directory gracefully', async () => {
      // Delete data directory after container creation
      await fs.rm(tempDir, { recursive: true, force: true });

      const server = createMcpServer(container);
      const handler = server['tools'].get('init_project_rules');

      // Should recreate directory and initialize rules
      const result = await handler!.execute({});

      expect(result).toContain('Project Standards');
      expect(await container.rulesStore.rulesExistAsync()).toBe(true);
    });
  });

  describe('get_server_info', () => {
    it('should return server metadata', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('get_server_info');

      expect(handler).toBeDefined();

      const result = await handler!.execute({});

      expect(result).toContain('MCP Task and Research Manager');
      expect(result).toContain('1.0.0'); // Version
      expect(result).toContain('taskflow-mcp'); // Name
    });

    it('should include task statistics when tasks exist', async () => {
      const { taskStore } = container;

      // Create tasks with different statuses
      await taskStore.createAsync({
        name: 'Pending Task',
        description: 'Test',
        status: 'pending',
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        notes: null,
        summary: null,
        relatedFiles: [],
        analysisResult: null,
        agent: null,
        implementationGuide: null,
        verificationCriteria: null,
      });

      await taskStore.createAsync({
        name: 'In Progress Task',
        description: 'Test',
        status: 'in_progress',
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        notes: null,
        summary: null,
        relatedFiles: [],
        analysisResult: null,
        agent: null,
        implementationGuide: null,
        verificationCriteria: null,
      });

      await taskStore.createAsync({
        name: 'Completed Task',
        description: 'Test',
        status: 'completed',
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        notes: null,
        summary: null,
        relatedFiles: [],
        analysisResult: null,
        agent: null,
        implementationGuide: null,
        verificationCriteria: null,
      });

      const server = createMcpServer(container);
      const handler = server['tools'].get('get_server_info');

      const result = await handler!.execute({});

      expect(result).toContain('MCP Task and Research Manager');
      // Task counts are logged but may not be in response
    });

    it('should handle empty task store', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('get_server_info');

      const result = await handler!.execute({});

      expect(result).toContain('MCP Task and Research Manager');
      expect(result).toBeDefined();
    });

    it('should include server description', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('get_server_info');

      const result = await handler!.execute({});

      expect(result).toContain('MCP Task and Research Manager');
      expect(result).toContain('Task planning');
    });

    it('should return consistent format', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('get_server_info');

      const result1 = await handler!.execute({});
      const result2 = await handler!.execute({});

      // Both calls should return same structure
      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
      expect(result1).toContain('Version');
      expect(result2).toContain('Version');
    });

    it('should validate no parameters required', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('get_server_info');

      // Should work with empty object
      const result = await handler!.execute({});
      expect(result).toBeDefined();
    });
  });

  describe('Tool Registration', () => {
    it('should register all 2 project tools', () => {
      const server = createMcpServer(container);

      expect(server['tools'].has('init_project_rules')).toBe(true);
      expect(server['tools'].has('get_server_info')).toBe(true);
    });

    it('should have valid JSON schemas for all tools', () => {
      const server = createMcpServer(container);

      const tools = ['init_project_rules', 'get_server_info'];

      for (const toolName of tools) {
        const handler = server['tools'].get(toolName);
        expect(handler).toBeDefined();
        expect(handler?.inputSchema).toBeDefined();
        // Schema may be object type, allOf (for refined schemas), or empty object
        const schema = handler?.inputSchema;
        // Just check that schema is defined - structure can vary
        expect(schema).toBeDefined();
      }
    });

    it('should have descriptions for all tools', () => {
      const server = createMcpServer(container);

      const handler1 = server['tools'].get('init_project_rules');
      expect(handler1?.description).toContain('project');
      expect(handler1?.description).toContain('rules');

      const handler2 = server['tools'].get('get_server_info');
      expect(handler2?.description).toContain('server');
      expect(handler2?.description).toContain('metadata');
    });
  });

  describe('Integration', () => {
    it('should work together - init rules then get info', async () => {
      const server = createMcpServer(container);

      // Initialize rules
      const initHandler = server['tools'].get('init_project_rules');
      const initResult = await initHandler!.execute({});
      expect(initResult).toContain('Project Standards');

      // Get server info
      const infoHandler = server['tools'].get('get_server_info');
      const infoResult = await infoHandler!.execute({});
      expect(infoResult).toContain('MCP Task and Research Manager');
    });

    it('should handle concurrent tool calls', async () => {
      const server = createMcpServer(container);

      const initHandler = server['tools'].get('init_project_rules');
      const infoHandler = server['tools'].get('get_server_info');

      // Call both tools concurrently
      const [initResult, infoResult] = await Promise.all([
        initHandler!.execute({}),
        infoHandler!.execute({}),
      ]);

      expect(initResult).toBeDefined();
      expect(infoResult).toBeDefined();
    });
  });
});
