/**
 * App Tools Tests
 *
 * Tests for the show_todo_list tool registration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createContainer, resetGlobalContainer, type ServiceContainer } from '../../../src/server/container.js';
import { createMcpServer } from '../../../src/server/mcpServer.js';
import type { TaskItem } from '../../../src/data/schemas.js';

describe('App Tools', () => {
  let tempDir: string;
  let container: ServiceContainer;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `apptools-${timestamp}-${random}-`));
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

  describe('show_todo_list', () => {
    it('should register the show_todo_list tool', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('show_todo_list');

      expect(handler).toBeDefined();
      expect(handler?.name).toBe('show_todo_list');
      expect(handler?.description).toContain('interactive todo list');
    });

    it('should return empty list when no tasks exist', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('show_todo_list');

      const result = await handler!.execute({});

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      const parsed = JSON.parse(result as string);
      expect(parsed.tasks).toEqual([]);
    });

    it('should return tasks when they exist', async () => {
      const { taskStore } = container;

      // Create some test tasks
      const task1: Partial<TaskItem> = {
        name: 'Test Task 1',
        description: 'Description 1',
        status: 'pending',
        dependencies: [],
        relatedFiles: [],
      };

      const task2: Partial<TaskItem> = {
        name: 'Test Task 2',
        description: 'Description 2',
        status: 'in_progress',
        dependencies: [],
        relatedFiles: [],
      };

      await taskStore.createAsync(task1);
      await taskStore.createAsync(task2);

      const server = createMcpServer(container);
      const handler = server['tools'].get('show_todo_list');

      const result = await handler!.execute({});

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      const parsed = JSON.parse(result as string);
      expect(parsed.tasks).toHaveLength(2);
      expect(parsed.tasks[0]?.name).toBe('Test Task 1');
      expect(parsed.tasks[1]?.name).toBe('Test Task 2');
    });

    it('should include all task properties in response', async () => {
      const { taskStore } = container;

      const task: Partial<TaskItem> = {
        name: 'Complete Task',
        description: 'A completed task',
        notes: 'Some notes',
        dependencies: [],
        relatedFiles: [
          {
            path: '/path/to/file.ts',
            type: 'TO_MODIFY',
            description: 'File to modify',
          },
        ],
      };

      const createdTask = await taskStore.createAsync(task);

      // Update status to completed
      await taskStore.updateAsync(createdTask.id, { status: 'completed' });

      const server = createMcpServer(container);
      const handler = server['tools'].get('show_todo_list');

      const result = await handler!.execute({});
      const parsed = JSON.parse(result as string);

      expect(parsed.tasks[0]).toMatchObject({
        name: 'Complete Task',
        description: 'A completed task',
        status: 'completed',
        notes: 'Some notes',
      });
      expect(parsed.tasks[0]?.relatedFiles).toHaveLength(1);
      expect(parsed.tasks[0]?.relatedFiles[0]?.path).toBe('/path/to/file.ts');
    });

    it('should handle tasks with dependencies', async () => {
      const { taskStore } = container;

      const task1 = await taskStore.createAsync({
        name: 'Dependency Task',
        description: 'A task that is a dependency',
        dependencies: [],
        relatedFiles: [],
      });

      // Update to completed
      await taskStore.updateAsync(task1.id, { status: 'completed' });

      const task2 = await taskStore.createAsync({
        name: 'Dependent Task',
        description: 'A task that depends on another',
        dependencies: [],
        relatedFiles: [],
      });

      // Add dependency using the correct format (dependency name strings, not objects)
      await taskStore.updateAsync(task2.id, { 
        dependencies: [task1.id]
      });

      const server = createMcpServer(container);
      const handler = server['tools'].get('show_todo_list');

      const result = await handler!.execute({});
      const parsed = JSON.parse(result as string);

      expect(parsed.tasks).toHaveLength(2);
      const dependentTask = parsed.tasks.find((t: TaskItem) => t.name === 'Dependent Task');
      expect(dependentTask?.dependencies).toHaveLength(1);
      expect(dependentTask?.dependencies[0]?.taskId).toBe(task1.id);
    });
  });
});
