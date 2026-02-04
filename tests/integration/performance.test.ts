/**
 * MCP Performance Integration Tests
 *
 * Tests server performance under load, concurrent requests,
 * and large datasets (1000+ tasks).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createContainer, resetGlobalContainer, ServiceContainer } from '../../dist/server/container.js';
import { createMcpServer } from '../../src/server/mcpServer.js';

describe('MCP Performance Tests', () => {
  let tempDir: string;
  let container: ServiceContainer;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `mcp-perf-${timestamp}-${random}-`));
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

  describe('Large Dataset Performance', () => {
    it('should handle 1000 tasks efficiently', async () => {
      const { taskStore } = container;
      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      // Create 1000 tasks in batches of 100
      const batchSize = 100;
      const totalTasks = 1000;
      const startTime = Date.now();

      for (let batch = 0; batch < totalTasks / batchSize; batch++) {
        const tasks = Array.from({ length: batchSize }, (_, i) => ({
          name: `Task ${batch * batchSize + i}`,
          description: `Description for task ${batch * batchSize + i}`,
        }));

        await handler!.execute({
          updateMode: 'append',
          tasks,
        });
      }

      const creationTime = Date.now() - startTime;
      console.log(`Created 1000 tasks in ${creationTime}ms`);

      // Should complete in reasonable time (< 45 seconds)
      expect(creationTime).toBeLessThan(45000);

      // Verify all tasks were created
      const allTasks = await taskStore.getAllAsync();
      expect(allTasks).toHaveLength(1000);

      // Test query performance
      const queryStart = Date.now();
      const results = await container.taskSearchService.search(
        await taskStore.getAllAsync(),
        { query: 'Task 500', page: 1, pageSize: 10 }
      );
      const queryTime = Date.now() - queryStart;

      console.log(`Queried 1000 tasks in ${queryTime}ms`);
      expect(queryTime).toBeLessThan(1000); // Should be fast (< 1 second)
      expect(results.tasks.length).toBeGreaterThan(0);
    }, 60000);

    it('should handle complex dependency graphs', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      // Create tasks with complex dependencies
      const tasks = [
        { name: 'Root Task', description: 'Root' },
        { name: 'Child 1', description: 'Child 1', dependencies: ['Root Task'] },
        { name: 'Child 2', description: 'Child 2', dependencies: ['Root Task'] },
        {
          name: 'Grandchild 1',
          description: 'Grandchild 1',
          dependencies: ['Child 1', 'Child 2'],
        },
      ];

      const startTime = Date.now();
      await handler!.execute({
        updateMode: 'append',
        tasks,
      });
      const executionTime = Date.now() - startTime;

      console.log(`Created dependency graph in ${executionTime}ms`);
      expect(executionTime).toBeLessThan(1000);

      // Verify dependencies were resolved
      const { taskStore } = container;
      const grandchild = (await taskStore.getAllAsync()).find((t) => t.name === 'Grandchild 1');

      expect(grandchild).toBeDefined();
      expect(grandchild!.dependencies).toHaveLength(2);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent tool calls', async () => {
      const server = createMcpServer(container);
      const planHandler = server['tools'].get('plan_task');

      // Execute multiple tool calls concurrently
      const startTime = Date.now();
      const promises = Array.from({ length: 10 }, (_, i) =>
        planHandler!.execute({
          description: `Concurrent task ${i}`,
          existingTasksReference: false,
        })
      );

      const results = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      console.log(`Executed 10 concurrent requests in ${executionTime}ms`);

      // All should succeed
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toBeTruthy();
      });

      // Should be faster than sequential execution
      expect(executionTime).toBeLessThan(5000);
    });

    it('should handle concurrent task creation without race conditions', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      // Create tasks concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        handler!.execute({
          updateMode: 'append',
          tasks: Array.from({ length: 10 }, (_, j) => ({
            name: `Concurrent Task ${i}-${j}`,
            description: `Batch ${i} task ${j}`,
          })),
        })
      );

      await Promise.all(promises);

      // Verify all tasks were created without duplicates
      const { taskStore } = container;
      const allTasks = await taskStore.getAllAsync();

      expect(allTasks).toHaveLength(50);

      // Verify no duplicate names
      const names = allTasks.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(50);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory with repeated operations', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('list_tasks');

      // Create some tasks first
      await server['tools'].get('split_tasks')!.execute({
        updateMode: 'append',
        tasks: Array.from({ length: 100 }, (_, i) => ({
          name: `Memory Test Task ${i}`,
          description: `Test task ${i}`,
        })),
      });

      // Get initial memory usage
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many list operations
      for (let i = 0; i < 100; i++) {
        await handler!.execute({ status: 'all' });
      }

      // Memory shouldn't grow significantly
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(`Memory growth after 100 list operations: ${memoryGrowth.toFixed(2)}MB`);

      // Should not grow more than 20MB (allow headroom for Windows GC variance)
      expect(memoryGrowth).toBeLessThan(20);
    });

    it('should clean up resources properly', async () => {
      const { taskStore } = container;

      // Create and delete tasks repeatedly
      for (let i = 0; i < 10; i++) {
        const task = await taskStore.createAsync({
          id: crypto.randomUUID(),
          name: `Cleanup Test ${i}`,
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

        await taskStore.deleteAsync(task.id);
      }

      // Should have no tasks after cleanup
      const allTasks = await taskStore.getAllAsync();
      expect(allTasks).toHaveLength(0);
    });
  });

  describe('Response Time Benchmarks', () => {
    it('should respond to simple queries quickly', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('get_server_info');

      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await handler!.execute({});
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`Average response time: ${avgTime.toFixed(2)}ms`);
      console.log(`Max response time: ${maxTime}ms`);

      // Average should be very fast (< 10ms)
      expect(avgTime).toBeLessThan(10);

      // Max should still be reasonable (< 100ms)
      expect(maxTime).toBeLessThan(100);
    });

    it('should maintain performance under sustained load', async () => {
      const server = createMcpServer(container);

      // Create 500 tasks
      const batchSize = 100;
      const totalTasks = 500;
      for (let batch = 0; batch < totalTasks / batchSize; batch++) {
        await server['tools'].get('split_tasks')!.execute({
          updateMode: 'append',
          tasks: Array.from({ length: batchSize }, (_, i) => ({
            name: `Load Test Task ${batch * batchSize + i}`,
            description: `Task ${batch * batchSize + i}`,
          })),
        });
      }

      const handler = server['tools'].get('list_tasks');
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await handler!.execute({ status: 'all' });
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      console.log(`Average list time with 500 tasks: ${avgTime.toFixed(2)}ms`);

      // Should maintain reasonable performance
      expect(avgTime).toBeLessThan(100);

      // Performance shouldn't degrade significantly over time
      const firstHalf = times.slice(0, 25).reduce((a, b) => a + b, 0) / 25;
      const secondHalf = times.slice(25).reduce((a, b) => a + b, 0) / 25;

      // Second half shouldn't be more than 50% slower
      expect(secondHalf).toBeLessThan(firstHalf * 1.5);
    }, 60000);
  });

  describe('Stress Tests', () => {
    it('should handle maximum task creation in single batch', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('split_tasks');

      // Create maximum allowed tasks (100)
      const tasks = Array.from({ length: 100 }, (_, i) => ({
        name: `Stress Task ${i}`,
        description: `Stress test task ${i}`,
      }));

      const startTime = Date.now();
      await handler!.execute({
        updateMode: 'append',
        tasks,
      });
      const executionTime = Date.now() - startTime;

      console.log(`Created 100 tasks in ${executionTime}ms`);

      expect(executionTime).toBeLessThan(4000); // Allow slower CI or Windows disk

      // Verify all tasks created
      const { taskStore } = container;
      const allTasks = await taskStore.getAllAsync();
      expect(allTasks).toHaveLength(100);
    });

    it('should handle long text fields efficiently', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('plan_task');

      // Create very long description (near max limit)
      const longDescription = 'A'.repeat(10000);
      const longRequirements = 'B'.repeat(10000);

      const startTime = Date.now();
      await handler!.execute({
        description: longDescription,
        requirements: longRequirements,
        existingTasksReference: false,
      });
      const executionTime = Date.now() - startTime;

      console.log(`Handled long text in ${executionTime}ms`);

      // Should still be reasonably fast
      expect(executionTime).toBeLessThan(2000);
    });
  });
});
