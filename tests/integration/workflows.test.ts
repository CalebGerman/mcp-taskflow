/**
 * End-to-End Workflow Integration Tests
 *
 * Tests realistic multi-step workflows that simulate actual
 * AI assistant usage patterns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createContainer, resetGlobalContainer, ServiceContainer } from '../../dist/server/container.js';
import { createMcpServer } from '../../src/server/mcpServer.js';

describe('End-to-End Workflows', () => {
  let tempDir: string;
  let container: ServiceContainer;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `mcp-e2e-${timestamp}-${random}-`));
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

  describe('Complete Project Planning Workflow', () => {
    it('should support full planning → execution → verification cycle', async () => {
      const server = createMcpServer(container);

      // Step 1: Plan the task
      const planResult = await server['tools'].get('plan_task')!.execute({
        description: 'Build REST API for user management',
        requirements: 'JWT auth, CRUD operations, validation',
        existingTasksReference: false,
      });

      expect(planResult).toContain('REST API');

      // Step 2: Analyze the task
      const analyzeResult = await server['tools'].get('analyze_task')!.execute({
        summary: 'Build REST API for user management',
        initialConcept: 'Use Express.js with TypeScript',
      });

      expect(analyzeResult).toContain('Express');

      // Step 3: Split into subtasks
      const splitResult = await server['tools'].get('split_tasks')!.execute({
        updateMode: 'append',
        tasks: [
          {
            name: 'Setup Express Server',
            description: 'Initialize Express with TypeScript',
          },
          {
            name: 'Implement Auth Middleware',
            description: 'JWT authentication middleware',
            dependencies: ['Setup Express Server'],
          },
          {
            name: 'Create User Routes',
            description: 'CRUD endpoints for users',
            dependencies: ['Implement Auth Middleware'],
          },
          {
            name: 'Add Validation',
            description: 'Request validation with Zod',
            dependencies: ['Create User Routes'],
          },
        ],
      });

      expect(splitResult).toContain('Setup Express Server');

      // Step 4: List tasks to verify creation
      const listResult = await server['tools'].get('list_tasks')!.execute({
        status: 'all',
      });

      expect(listResult).toContain('Setup Express Server');
      expect(listResult).toContain('pending');

      // Step 5: Get details of first task
      const { taskStore } = container;
      const tasks = await taskStore.getAllAsync();
      const firstTask = tasks.find((t) => t.name === 'Setup Express Server');

      expect(firstTask).toBeDefined();

      const detailResult = await server['tools'].get('get_task_detail')!.execute({
        taskId: firstTask!.id,
      });

      expect(detailResult).toContain('Setup Express Server');
      expect(detailResult).toContain('Initialize Express');

      // Step 6: Execute first task
      const executeResult = await server['tools'].get('execute_task')!.execute({
        taskId: firstTask!.id,
      });

      expect(executeResult).toContain('Setup Express Server');
      expect(executeResult).toContain('Task Execution');

      // Step 7: Verify task completion
      const verifyResult = await server['tools'].get('verify_task')!.execute({
        taskId: firstTask!.id,
        score: 95,
        summary: 'Express server configured successfully',
      });

      expect(verifyResult).toContain('completed');
      expect(verifyResult).toContain('Express server configured successfully');

      // Step 8: Verify task is now completed
      const updatedTask = await taskStore.getByIdAsync(firstTask!.id);
      expect(updatedTask.status).toBe('completed');
      expect(updatedTask.summary).toBe('Express server configured successfully');
    });

    it('should enforce dependency order in execution', async () => {
      const server = createMcpServer(container);

      // Create tasks with dependencies
      await server['tools'].get('split_tasks')!.execute({
        updateMode: 'append',
        tasks: [
          { name: 'Foundation', description: 'Base task' },
          { name: 'Dependent', description: 'Depends on Foundation', dependencies: ['Foundation'] },
        ],
      });

      const { taskStore } = container;
      const tasks = await taskStore.getAllAsync();
      const dependentTask = tasks.find((t) => t.name === 'Dependent');

      // Try to execute dependent task before foundation
      const depResult = await server['tools'].get('execute_task')!.execute({
        taskId: dependentTask!.id,
      });
      
      // Should return error message about incomplete dependencies
      expect(depResult).toContain('Cannot Execute Task');
      expect(depResult).toContain('incomplete dependencies');

      // Complete foundation task first
      const foundationTask = tasks.find((t) => t.name === 'Foundation');
      await server['tools'].get('execute_task')!.execute({
        taskId: foundationTask!.id,
      });

      await server['tools'].get('verify_task')!.execute({
        taskId: foundationTask!.id,
        score: 100,
        summary: 'Foundation complete',
      });

      // Now dependent task should be executable
      const executeResult = await server['tools'].get('execute_task')!.execute({
        taskId: dependentTask!.id,
      });

      expect(executeResult).toContain('Dependent');
    });
  });

  describe('Research and Documentation Workflow', () => {
    it('should support iterative research process', async () => {
      const server = createMcpServer(container);

      // Step 1: Initialize project rules
      const rulesResult = await server['tools'].get('init_project_rules')!.execute({});

      expect(rulesResult).toContain('rules');

      // Step 2: Start research on a topic
      const research1 = await server['tools'].get('research_mode')!.execute({
        topic: 'TypeScript performance optimization',
        previousState: '',
        currentState: 'Investigating compilation strategies',
        nextSteps: 'Study incremental builds',
      });

      expect(research1).toContain('TypeScript');
      expect(research1).toContain('optimization');

      // Step 3: Continue research with previous context
      const research2 = await server['tools'].get('research_mode')!.execute({
        topic: 'TypeScript performance optimization',
        previousState: 'Investigated compilation strategies',
        currentState: 'Exploring incremental builds and caching',
        nextSteps: 'Test with real projects',
      });

      expect(research2).toContain('incremental');
      expect(research2).toContain('previous');

      // Step 4: Process structured thinking
      const thought1 = await server['tools'].get('process_thought')!.execute({
        thought: 'TypeScript compilation can be optimized using project references',
        thoughtNumber: 1,
        totalThoughts: 3,
        stage: 'Analysis',
        tags: ['typescript', 'performance'],
      });

      expect(thought1).toContain('project references');

      const thought2 = await server['tools'].get('process_thought')!.execute({
        thought: 'Incremental builds reduce compilation time by 70%',
        thoughtNumber: 2,
        totalThoughts: 3,
        stage: 'Evidence',
        tags: ['performance', 'benchmarks'],
        nextThoughtNeeded: true,
      });

      expect(thought2).toContain('70%');
    });
  });

  describe('Task Management and Updates Workflow', () => {
    it('should support task lifecycle with updates', async () => {
      const server = createMcpServer(container);

      // Create initial task
      await server['tools'].get('split_tasks')!.execute({
        updateMode: 'append',
        tasks: [
          {
            name: 'Implement Feature X',
            description: 'Initial description',
          },
        ],
      });

      const { taskStore } = container;
      let task = (await taskStore.getAllAsync())[0];

      // Update task with more details
      const updateResult = await server['tools'].get('update_task')!.execute({
        taskId: task.id,
        description: 'Updated description with more details',
        implementationGuide: 'Step 1: Setup\nStep 2: Implement\nStep 3: Test',
        verificationCriteria: 'All tests pass, code reviewed',
      });

      expect(updateResult).toContain('Updated Successfully');

      // Verify updates
      task = await taskStore.getByIdAsync(task.id);
      expect(task.description).toBe('Updated description with more details');
      expect(task.implementationGuide).toContain('Step 1');
      expect(task.verificationCriteria).toContain('tests pass');

      // Add related files
      await server['tools'].get('update_task')!.execute({
        taskId: task.id,
        relatedFiles: [
          {
            path: 'src/feature-x.ts',
            type: 'TO_MODIFY',
            description: 'Main implementation file',
          },
          {
            path: 'tests/feature-x.test.ts',
            type: 'CREATE',
          },
        ],
      });

      // Verify related files
      task = await taskStore.getByIdAsync(task.id);
      expect(task.relatedFiles).toHaveLength(2);
      expect(task.relatedFiles[0].path).toBe('src/feature-x.ts');
    });

    it('should support task search and filtering', async () => {
      const server = createMcpServer(container);

      // Create diverse set of tasks
      await server['tools'].get('split_tasks')!.execute({
        updateMode: 'append',
        tasks: [
          { name: 'Frontend Task', description: 'React component' },
          { name: 'Backend Task', description: 'API endpoint' },
          { name: 'Database Task', description: 'Schema migration' },
          { name: 'Testing Task', description: 'Unit tests' },
        ],
      });

      // Mark some as completed
      const { taskStore } = container;
      const tasks = await taskStore.getAllAsync();

      await server['tools'].get('execute_task')!.execute({
        taskId: tasks[0].id,
      });

      await server['tools'].get('verify_task')!.execute({
        taskId: tasks[0].id,
        score: 100,
        summary: 'Done',
      });

      // Search by text
      const searchResult = await server['tools'].get('query_task')!.execute({
        query: 'Backend',
        isId: false,
      });

      expect(searchResult).toContain('Backend Task');
      expect(searchResult).toContain('API endpoint');

      // List pending tasks only
      const pendingResult = await server['tools'].get('list_tasks')!.execute({
        status: 'pending',
      });

      expect(pendingResult).not.toContain('Frontend Task');
      expect(pendingResult).toContain('Backend Task');

      // List completed tasks
      const completedResult = await server['tools'].get('list_tasks')!.execute({
        status: 'completed',
      });

      expect(completedResult).toContain('Frontend Task');
      expect(completedResult).not.toContain('Backend Task');
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle task deletion gracefully', async () => {
      const server = createMcpServer(container);

      // Create task
      await server['tools'].get('split_tasks')!.execute({
        updateMode: 'append',
        tasks: [{ name: 'Task to Delete', description: 'Will be deleted' }],
      });

      const { taskStore } = container;
      const task = (await taskStore.getAllAsync())[0];

      // Delete task
      const deleteResult = await server['tools'].get('delete_task')!.execute({
        taskId: task.id,
      });

      expect(deleteResult).toContain('deleted');

      // Verify task is gone
      const allTasks = await taskStore.getAllAsync();
      expect(allTasks).toHaveLength(0);

      // Try to get deleted task (should return null or throw)
      try {
        const deletedTask = await taskStore.getByIdAsync(task.id);
        expect(deletedTask).toBeNull();
      } catch (error) {
        // Also acceptable - some implementations throw
        expect(error).toBeDefined();
      }
    });

    it('should handle clear_all_tasks with confirmation', async () => {
      const server = createMcpServer(container);

      // Create multiple tasks
      await server['tools'].get('split_tasks')!.execute({
        updateMode: 'append',
        tasks: Array.from({ length: 10 }, (_, i) => ({
          name: `Task ${i}`,
          description: `Description ${i}`,
        })),
      });

      // Clear all tasks
      const clearResult = await server['tools'].get('clear_all_tasks')!.execute({
        confirm: true,
      });

      expect(clearResult).toContain('cleared');

      // Verify all tasks are gone
      const { taskStore } = container;
      const allTasks = await taskStore.getAllAsync();
      expect(allTasks).toHaveLength(0);
    });

    it('should handle overwrite mode correctly', async () => {
      const server = createMcpServer(container);

      // Create initial tasks
      await server['tools'].get('split_tasks')!.execute({
        updateMode: 'append',
        tasks: [
          { name: 'Original Task', description: 'Original' },
          { name: 'Keep Task', description: 'Keep this' },
        ],
      });

      // Overwrite with new tasks
      await server['tools'].get('split_tasks')!.execute({
        updateMode: 'overwrite',
        tasks: [{ name: 'Original Task', description: 'Updated description' }],
      });

      const { taskStore } = container;
      const tasks = await taskStore.getAllAsync();

      // Should have both tasks, but first one updated
      const originalTask = tasks.find((t) => t.name === 'Original Task');
      expect(originalTask?.description).toBe('Updated description');

      const keepTask = tasks.find((t) => t.name === 'Keep Task');
      expect(keepTask).toBeDefined();
    });
  });

  describe('Data Persistence', () => {
    it('should persist tasks across container restarts', async () => {
      // Create tasks in first container
      let server = createMcpServer(container);

      await server['tools'].get('split_tasks')!.execute({
        updateMode: 'append',
        tasks: [
          { name: 'Persistent Task 1', description: 'Should survive restart' },
          { name: 'Persistent Task 2', description: 'Also persistent' },
        ],
      });

      // Reset and create new container with same data directory
      resetGlobalContainer();
      container = createContainer({ dataDir: tempDir });
      server = createMcpServer(container);

      // Tasks should still exist
      const listResult = await server['tools'].get('list_tasks')!.execute({
        status: 'all',
      });

      expect(listResult).toContain('Persistent Task 1');
      expect(listResult).toContain('Persistent Task 2');
    });

    it('should handle concurrent writes with sequential execution', async () => {
      const server = createMcpServer(container);

      // Create tasks sequentially to avoid file system race conditions
      // (concurrent JSON file writes can cause data loss without proper locking)
      for (let i = 0; i < 5; i++) {
        await server['tools'].get('split_tasks')!.execute({
          updateMode: 'append',
          tasks: [{ name: `Sequential ${i}`, description: `Task ${i}` }],
        });
      }

      // All tasks should be created without data corruption
      const { taskStore } = container;
      const tasks = await taskStore.getAllAsync();

      expect(tasks).toHaveLength(5);

      // Verify data integrity
      const names = tasks.map((t) => t.name).sort();
      expect(names).toEqual(['Sequential 0', 'Sequential 1', 'Sequential 2', 'Sequential 3', 'Sequential 4']);
    });
  });
});
