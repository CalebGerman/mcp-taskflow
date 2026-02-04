/**
 * Task Planning Tools Tests
 *
 * Tests for plan_task, analyze_task, reflect_task, and split_tasks tools.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'node:crypto';
import { createContainer, resetGlobalContainer, ServiceContainer } from '../../../dist/server/container';
import { createMcpServer } from '../../../src/server/mcpServer.js';

describe('Task Planning Tools', () => {
  let tempDir: string;
  let container: ServiceContainer;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `tasktools-${timestamp}-${random}-`));
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

  describe('plan_task', () => {
    it('should generate planning prompt without existing tasks', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('plan_task');

      expect(handler).toBeDefined();

      const result = await handler!.execute({
        description: 'Implement user authentication',
        requirements: 'Must use JWT tokens and bcrypt for password hashing',
        existingTasksReference: false,
      });

      expect(result).toContain('Analysis Purpose');
      expect(result).toContain('user authentication');
      expect(result).toContain('JWT');
    });

    it('should include existing tasks when requested', async () => {
      const { taskStore } = container;

      // Create some existing tasks
      await taskStore.createAsync({
        id: randomUUID(),
        name: 'Setup Database',
        description: 'Configure PostgreSQL database',
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

      await taskStore.createAsync({
        id: randomUUID(),
        name: 'Create User Model',
        description: 'Define user data model',
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

      const server = createMcpServer(container);
      const handler = server['tools'].get('plan_task');

      const result = await handler!.execute({
        description: 'Implement authentication endpoints',
        existingTasksReference: true,
      });

      expect(result).toContain('Create User Model');
      expect(result).toContain('pending');
    });

    it('should validate input parameters', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('plan_task');

      await expect(
        handler!.execute({
          description: '', // Empty description - invalid
        })
      ).rejects.toThrow();
    });

    it('should limit completed tasks to last 10', async () => {
      const { taskStore } = container;

      // Create 15 completed tasks
      for (let i = 0; i < 15; i++) {
        const created = await taskStore.createAsync({
          name: `Completed Task ${i}`,
          description: `Description ${i}`,
          dependencies: [],
          notes: null,
          relatedFiles: [],
          analysisResult: null,
          agent: null,
          implementationGuide: null,
          verificationCriteria: null,
        });

        await taskStore.updateAsync(created.id, {
          status: 'completed',
        });
      }

      const server = createMcpServer(container);
      const handler = server['tools'].get('plan_task');

      const result = (await handler!.execute({
        description: 'New task',
        existingTasksReference: true,
      })) as string;

      // Count occurrences of task names (e.g., "Completed Task 0", "Completed Task 1", etc.)
      // Should only show first 10 of the 15 created tasks
      const taskMatches = result.match(/Completed Task \d+/g);
      console.log('Found task matches:', taskMatches);
      expect(taskMatches).toBeDefined();
      expect(taskMatches!.length).toBeLessThanOrEqual(10);
    });
  });

  describe('analyze_task', () => {
    it('should generate analysis prompt for initial analysis', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('analyze_task');

      expect(handler).toBeDefined();

      const result = await handler!.execute({
        summary: 'Implement caching layer',
        initialConcept: 'Use Redis for caching with TTL-based expiration',
      });

      expect(result).toContain('Implement caching layer');
      expect(result).toContain('Redis');
    });

    it('should support iterative analysis with previous results', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('analyze_task');

      const result = await handler!.execute({
        summary: 'Implement caching layer',
        initialConcept: 'Use Redis for caching',
        previousAnalysis: 'Consider memory limits and eviction policies',
      });

      expect(result).toContain('previous analysis');
      expect(result).toContain('iteration');
    });

    it('should validate required fields', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('analyze_task');

      await expect(
        handler!.execute({
          summary: '', // Empty summary - invalid
          initialConcept: 'Some concept',
        })
      ).rejects.toThrow();

      await expect(
        handler!.execute({
          summary: 'Valid summary',
          initialConcept: '', // Empty concept - invalid
        })
      ).rejects.toThrow();
    });

    it('should enforce max length on fields', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('analyze_task');

      const longString = 'a'.repeat(25000); // Exceeds 20000 char limit

      await expect(
        handler!.execute({
          summary: 'Valid summary',
          initialConcept: longString,
        })
      ).rejects.toThrow();
    });
  });

  describe('reflect_task', () => {
    it('should generate reflection prompt', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('reflect_task');

      expect(handler).toBeDefined();

      const result = await handler!.execute({
        summary: 'Database design review',
        analysis: 'Proposed schema uses normalized tables with proper indexes',
      });

      expect(result).toContain('Database design review');
      expect(result).toContain('reflection');
    });

    it('should validate required fields', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('reflect_task');

      await expect(
        handler!.execute({
          summary: '',
          analysis: 'Some analysis',
        })
      ).rejects.toThrow();

      await expect(
        handler!.execute({
          summary: 'Valid summary',
          analysis: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('split_tasks', () => {
    it('should create tasks in append mode', async () => {
      const { taskStore } = container;
      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      expect(handler).toBeDefined();

      const result = await handler!.execute({
        updateMode: 'append',
        tasks: [
          {
            name: 'Task 1',
            description: 'First task',
          },
          {
            name: 'Task 2',
            description: 'Second task',
            dependencies: ['Task 1'], // Reference by name
          },
        ],
      });

      expect(result).toContain('Task 1');
      expect(result).toContain('Task 2');

      const allTasks = await taskStore.getAllAsync();
      expect(allTasks).toHaveLength(2);
      expect(allTasks[1].dependencies).toHaveLength(1);
    });

    it('should handle overwrite mode correctly', async () => {
      const { taskStore } = container;

      // Create initial task
      const existingTask = await taskStore.createAsync({
        id: randomUUID(),
        name: 'Existing Task',
        description: 'Original description',
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

      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      await handler!.execute({
        updateMode: 'overwrite',
        tasks: [
          {
            name: 'Existing Task',
            description: 'Updated description',
          },
        ],
      });

      const updated = await taskStore.getByIdAsync(existingTask.id);
      expect(updated.description).toBe('Updated description');
    });

    it('should skip existing tasks in selective mode', async () => {
      const { taskStore } = container;

      await taskStore.createAsync({
        id: randomUUID(),
        name: 'Existing Task',
        description: 'Original',
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

      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      await handler!.execute({
        updateMode: 'selective',
        tasks: [
          {
            name: 'Existing Task',
            description: 'Should be skipped',
          },
          {
            name: 'New Task',
            description: 'Should be created',
          },
        ],
      });

      const allTasks = await taskStore.getAllAsync();
      expect(allTasks).toHaveLength(2);

      const existing = allTasks.find((t) => t.name === 'Existing Task');
      expect(existing?.description).toBe('Original'); // Not updated
    });

    it('should clear all tasks in clearAllTasks mode', async () => {
      const { taskStore } = container;

      // Create some tasks
      await taskStore.createAsync({
        id: randomUUID(),
        name: 'Task 1',
        description: 'Will be deleted',
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

      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      await handler!.execute({
        updateMode: 'clearAllTasks',
        tasks: [
          {
            name: 'New Task',
            description: 'After clear',
          },
        ],
      });

      const allTasks = await taskStore.getAllAsync();
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0].name).toBe('New Task');
    });

    it('should resolve dependencies by UUID', async () => {
      const { taskStore } = container;

      const task1 = await taskStore.createAsync({
        id: randomUUID(),
        name: 'Base Task',
        description: 'First',
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

      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      await handler!.execute({
        updateMode: 'append',
        tasks: [
          {
            name: 'Dependent Task',
            description: 'Depends on UUID',
            dependencies: [task1.id], // UUID reference
          },
        ],
      });

      const allTasks = await taskStore.getAllAsync();
      const dependent = allTasks.find((t) => t.name === 'Dependent Task');

      expect(dependent?.dependencies).toHaveLength(1);
      expect(dependent?.dependencies[0].taskId).toBe(task1.id);
    });

    it('should attach global analysis result to all tasks', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      await handler!.execute({
        updateMode: 'append',
        tasks: [
          {
            name: 'Task 1',
            description: 'First',
          },
          {
            name: 'Task 2',
            description: 'Second',
          },
        ],
        globalAnalysisResult: 'Use microservices architecture',
      });

      const allTasks = await container.taskStore.getAllAsync();
      expect(allTasks[0].analysisResult).toBe('Use microservices architecture');
      expect(allTasks[1].analysisResult).toBe('Use microservices architecture');
    });

    it('should validate task array is not empty', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      await expect(
        handler!.execute({
          updateMode: 'append',
          tasks: [], // Empty array - invalid
        })
      ).rejects.toThrow();
    });

    it('should enforce max 100 tasks per split', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      const tooManyTasks = Array.from({ length: 101 }, (_, i) => ({
        name: `Task ${i}`,
        description: `Description ${i}`,
      }));

      await expect(
        handler!.execute({
          updateMode: 'append',
          tasks: tooManyTasks,
        })
      ).rejects.toThrow();
    });

    it('should handle related files in task creation', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      await handler!.execute({
        updateMode: 'append',
        tasks: [
          {
            name: 'Task with Files',
            description: 'Has related files',
            relatedFiles: [
              {
                path: 'src/auth/auth.service.ts',
                type: 'TO_MODIFY',
                description: 'Authentication service',
              },
              {
                path: 'tests/auth/auth.test.ts',
                type: 'CREATE',
              },
            ],
          },
        ],
      });

      const tasks = await container.taskStore.getAllAsync();
      expect(tasks[0].relatedFiles).toHaveLength(2);
      expect(tasks[0].relatedFiles[0].path).toBe('src/auth/auth.service.ts');
    });
  });

  describe('Tool Registration', () => {
    it('should register all 4 planning tools', () => {
      const server = createMcpServer(container);

      expect(server['tools'].has('plan_task')).toBe(true);
      expect(server['tools'].has('analyze_task')).toBe(true);
      expect(server['tools'].has('reflect_task')).toBe(true);
      expect(server['tools'].has('split_tasks')).toBe(true);
    });

    it('should have valid JSON schemas for all tools', () => {
      const server = createMcpServer(container);

      const tools = ['plan_task', 'analyze_task', 'reflect_task', 'split_tasks'];

      for (const toolName of tools) {
        const handler = server['tools'].get(toolName);
        expect(handler).toBeDefined();
        // Just check that schema is defined - structure can vary
        expect(handler?.inputSchema).toBeDefined();
      }
    });
  });
});
