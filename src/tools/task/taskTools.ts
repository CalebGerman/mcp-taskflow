/**
 * Task Planning Tools Implementation
 *
 * Implements MCP tools for task planning, analysis, reflection, and splitting.
 * These tools guide AI assistants through structured workflow patterns.
 *
 * Tools:
 * - plan_task: Convert natural language requests into structured tasks
 * - analyze_task: Deep analysis with threat modeling and design decisions
 * - reflect_task: Critical review and optimization recommendations
 * - split_tasks: Bulk task creation with dependency management
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import type { McpServer } from '../../server/mcpServer.js';
import type { ServiceContainer } from '../../server/container.js';
import type { TaskCreateRequest, TaskUpdateRequest } from '../../data/taskStore.js';
import {
  PlanTaskParamsSchema,
  AnalyzeTaskParamsSchema,
  ReflectTaskParamsSchema,
  SplitTasksParamsSchema,
  ListTasksParamsSchema,
  GetTaskDetailParamsSchema,
  QueryTaskParamsSchema,
  UpdateTaskParamsSchema,
  DeleteTaskParamsSchema,
  ClearAllTasksParamsSchema,
  ExecuteTaskParamsSchema,
  VerifyTaskParamsSchema,
  type PlanTaskParams,
  type AnalyzeTaskParams,
  type ReflectTaskParams,
  type SplitTasksParams,
  type ListTasksParams,
  type GetTaskDetailParams,
  type QueryTaskParams,
  type UpdateTaskParams,
  type DeleteTaskParams,
  type ClearAllTasksParams,
  type ExecuteTaskParams,
  type VerifyTaskParams,
  type TaskItem,
  type CreateTaskParams,
} from '../../data/schemas.js';
import {
  PlanTaskPromptBuilder,
  AnalyzeTaskPromptBuilder,
  ReflectTaskPromptBuilder,
  SplitTasksPromptBuilder,
  ListTasksPromptBuilder,
  GetTaskDetailPromptBuilder,
  QueryTaskPromptBuilder,
  UpdateTaskPromptBuilder,
  DeleteTaskPromptBuilder,
  ClearAllTasksPromptBuilder,
  ExecuteTaskPromptBuilder,
  VerifyTaskPromptBuilder,
} from '../../prompts/taskPromptBuilders.js';


/**
 * Register all task planning tools with the MCP server
 *
 * @param server - MCP server instance
 */
export function registerTaskPlanningTools(server: McpServer): void {
  const container = server.getContainer();

  registerPlanTask(server, container);
  registerAnalyzeTask(server, container);
  registerReflectTask(server, container);
  registerSplitTasks(server, container);
}

/**
 * Register all task CRUD tools with the MCP server
 *
 * @param server - MCP server instance
 */
export function registerTaskCRUDTools(server: McpServer): void {
  const container = server.getContainer();

  registerListTasks(server, container);
  registerGetTaskDetail(server, container);
  registerQueryTask(server, container);
  registerUpdateTask(server, container);
  registerDeleteTask(server, container);
  registerClearAllTasks(server, container);
}

/**
 * Register list_tasks tool
 */
function registerListTasks(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'list_tasks',
    description: 'List tasks by status. Returns task overview with counts and filtering.',
    inputSchema: zodToJsonSchema(ListTasksParamsSchema, 'ListTasksParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = ListTasksParamsSchema.parse(args) as ListTasksParams;
      const { taskStore, logger } = container;

      logger.info({ status: params.status }, 'Listing tasks');

      const allTasks = await taskStore.getAllAsync();
      const builder = new ListTasksPromptBuilder();
      const statusFilter = params.status === 'all' ? undefined : params.status;
      const result = await builder.build(allTasks, statusFilter);

      logger.info({ count: allTasks.length }, 'Tasks listed');
      return result;
    },
  });
}

/**
 * Register get_task_detail tool
 */
function registerGetTaskDetail(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'get_task_detail',
    description: 'Get complete details for a specific task including dependencies and related files.',
    inputSchema: zodToJsonSchema(GetTaskDetailParamsSchema, 'GetTaskDetailParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = GetTaskDetailParamsSchema.parse(args) as GetTaskDetailParams;
      const { taskStore, logger } = container;

      logger.info({ taskId: params.taskId }, 'Getting task detail');

      const task = await taskStore.getByIdAsync(params.taskId);
      if (!task) {
        logger.warn({ taskId: params.taskId }, 'Task not found');
        return `## Task Not Found\n\nNo task found with ID: \`${params.taskId}\``;
      }

      const allTasks = await taskStore.getAllAsync();
      const builder = new GetTaskDetailPromptBuilder();
      const result = await builder.build(task, allTasks);

      logger.info({ taskId: params.taskId }, 'Task detail retrieved');
      return result;
    },
  });
}

/**
 * Register query_task tool
 */
function registerQueryTask(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'query_task',
    description: 'Search tasks by keyword or ID with pagination support.',
    inputSchema: zodToJsonSchema(QueryTaskParamsSchema, 'QueryTaskParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = QueryTaskParamsSchema.parse(args) as QueryTaskParams;
      const { taskStore, taskSearchService, logger } = container;

      logger.info({ query: params.query, page: params.page }, 'Querying tasks');

      const allTasks = await taskStore.getAllAsync();
      
      let results;
      if (params.isId) {
        const task = allTasks.find(t => t.id === params.query);
        results = {
          tasks: task ? [task] : [],
          total: task ? 1 : 0,
          page: 1,
          pageSize: 1,
          totalPages: task ? 1 : 0,
        };
      } else {
        results = taskSearchService.search(allTasks, {
          query: params.query,
          page: params.page,
          pageSize: params.pageSize,
        });
      }

      const builder = new QueryTaskPromptBuilder();
      const response = await builder.build(
        params.query,
        results.tasks,
        results.page,
        results.pageSize,
        results.total
      );

      logger.info({ resultCount: results.tasks.length }, 'Query complete');
      return response;
    },
  });
}

/**
 * Register update_task tool
 */
function registerUpdateTask(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'update_task',
    description: 'Update task details, dependencies, or related files.',
    inputSchema: zodToJsonSchema(UpdateTaskParamsSchema, 'UpdateTaskParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = UpdateTaskParamsSchema.parse(args) as UpdateTaskParams;
      const { taskStore, logger } = container;

      logger.info({ taskId: params.taskId }, 'Updating task');

      const existingTask = await taskStore.getByIdAsync(params.taskId);
      if (!existingTask) {
        const builder = new UpdateTaskPromptBuilder();
        return await builder.buildNotFound(params.taskId);
      }

      const updates: TaskUpdateRequest = {};
      
      if (params.name !== undefined && params.name !== null) updates.name = params.name;
      if (params.description !== undefined && params.description !== null) updates.description = params.description;
      if (params.notes !== undefined) updates.notes = params.notes ?? undefined;
      if (params.dependencies !== undefined) updates.dependencies = params.dependencies;
      if (params.relatedFiles !== undefined) updates.relatedFiles = params.relatedFiles;
      if (params.implementationGuide !== undefined) updates.implementationGuide = params.implementationGuide ?? undefined;
      if (params.verificationCriteria !== undefined) updates.verificationCriteria = params.verificationCriteria ?? undefined;

      const updatedTask = await taskStore.updateAsync(params.taskId, updates);
      if (!updatedTask) {
        throw new Error(`Failed to update task ${params.taskId}`);
      }

      const updatedFields: string[] = [];
      if (params.name !== undefined) updatedFields.push('name');
      if (params.description !== undefined) updatedFields.push('description');
      if (params.notes !== undefined) updatedFields.push('notes');
      if (params.dependencies !== undefined) updatedFields.push('dependencies');
      if (params.relatedFiles !== undefined) updatedFields.push('relatedFiles');
      if (params.implementationGuide !== undefined) updatedFields.push('implementationGuide');
      if (params.verificationCriteria !== undefined) updatedFields.push('verificationCriteria');

      const builder = new UpdateTaskPromptBuilder();
      const result = await builder.buildResult(updatedTask, updatedFields);

      logger.info({ taskId: params.taskId, fieldsUpdated: updatedFields.length }, 'Task updated');
      return result;
    },
  });
}

/**
 * Register delete_task tool
 */
function registerDeleteTask(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'delete_task',
    description: 'Delete a task. Completed tasks are archived, others are removed.',
    inputSchema: zodToJsonSchema(DeleteTaskParamsSchema, 'DeleteTaskParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = DeleteTaskParamsSchema.parse(args) as DeleteTaskParams;
      const { taskStore, logger } = container;

      logger.info({ taskId: params.taskId }, 'Deleting task');

      const task = await taskStore.getByIdAsync(params.taskId);
      if (!task) {
        const builder = new DeleteTaskPromptBuilder();
        return await builder.buildNotFound(params.taskId);
      }

      await taskStore.deleteAsync(params.taskId);

      const builder = new DeleteTaskPromptBuilder();
      const result = task.status === 'completed'
        ? await builder.buildCompleted(task.id)
        : await builder.buildResult(task.name);

      logger.info({ taskId: params.taskId, status: task.status }, 'Task deleted');
      return result;
    },
  });
}

/**
 * Register clear_all_tasks tool
 */
function registerClearAllTasks(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'clear_all_tasks',
    description: 'Clear all tasks after confirmation. Creates backup before deletion.',
    inputSchema: zodToJsonSchema(ClearAllTasksParamsSchema, 'ClearAllTasksParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = ClearAllTasksParamsSchema.parse(args) as ClearAllTasksParams;
      const { taskStore, logger } = container;

      const allTasks = await taskStore.getAllAsync();

      if (!params.confirm) {
        const builder = new ClearAllTasksPromptBuilder();
        return await builder.buildCancel();
      }

      if (allTasks.length === 0) {
        const builder = new ClearAllTasksPromptBuilder();
        return await builder.buildEmpty();
      }

      logger.warn({ taskCount: allTasks.length }, 'Clearing all tasks');

      const clearResult = await taskStore.clearAllAsync();

      const builder = new ClearAllTasksPromptBuilder();
      const backupPath = clearResult.backupFile ?? 'No backup created';
      const result = await builder.buildResult(allTasks.length, backupPath);

      logger.info({ taskCount: allTasks.length }, 'All tasks cleared');
      return result;
    },
  });
}

/**
 * Register all task workflow tools with the MCP server
 *
 * @param server - MCP server instance
 */
export function registerTaskWorkflowTools(server: McpServer): void {
  const container = server.getContainer();

  registerExecuteTask(server, container);
  registerVerifyTask(server, container);
}

/**
 * Register execute_task tool
 */
function registerExecuteTask(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'execute_task',
    description: 'Mark a task as in progress and build an execution prompt with dependencies and implementation guide.',
    inputSchema: zodToJsonSchema(ExecuteTaskParamsSchema, 'ExecuteTaskParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = ExecuteTaskParamsSchema.parse(args) as ExecuteTaskParams;
      const { taskStore, logger } = container;

      logger.info({ taskId: params.taskId }, 'Executing task');

      const task = await taskStore.getByIdAsync(params.taskId);
      if (!task) {
        logger.warn({ taskId: params.taskId }, 'Task not found');
        return `## Task Not Found\n\nNo task found with ID: \`${params.taskId}\``;
      }

      const allTasks = await taskStore.getAllAsync();
      const dependencyTasks = task.dependencies
        .map(dep => allTasks.find(t => t.id === dep.taskId))
        .filter((t): t is TaskItem => t !== undefined);

      const incompleteDeps = dependencyTasks.filter(t => t.status !== 'completed');
      if (incompleteDeps.length > 0) {
        logger.warn({ taskId: params.taskId, incompleteDeps: incompleteDeps.length }, 'Task has incomplete dependencies');
        return `## Cannot Execute Task\n\nTask "${task.name}" has ${incompleteDeps.length} incomplete dependencies:\n\n` +
          incompleteDeps.map(d => `- ${d.name} (${d.status})`).join('\n');
      }

      if (task.status !== 'in_progress') {
        await taskStore.updateAsync(params.taskId, { status: 'in_progress' });
      }

      const complexity = calculateComplexity(task, dependencyTasks);
      const builder = new ExecuteTaskPromptBuilder();
      const result = await builder.build(
        task,
        dependencyTasks,
        complexity,
        task.analysisResult ?? undefined
      );

      logger.info({ taskId: params.taskId, complexity }, 'Task execution started');
      return result;
    },
  });
}

/**
 * Register verify_task tool
 */
function registerVerifyTask(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'verify_task',
    description: 'Verify task completion with a score and summary. Marks task as completed.',
    inputSchema: zodToJsonSchema(VerifyTaskParamsSchema, 'VerifyTaskParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = VerifyTaskParamsSchema.parse(args) as VerifyTaskParams;
      const { taskStore, logger } = container;

      logger.info({ taskId: params.taskId, score: params.score }, 'Verifying task');

      const task = await taskStore.getByIdAsync(params.taskId);
      if (!task) {
        logger.warn({ taskId: params.taskId }, 'Task not found');
        return `## Task Not Found\n\nNo task found with ID: \`${params.taskId}\``;
      }

      await taskStore.updateAsync(params.taskId, {
        status: 'completed',
        summary: params.summary,
      });

      const builder = new VerifyTaskPromptBuilder();
      const result = await builder.build(task);

      logger.info({ taskId: params.taskId, score: params.score }, 'Task verified and completed');
      return result;
    },
  });
}

/**
 * Calculate task complexity based on description length and dependencies
 */
function calculateComplexity(
  task: TaskItem,
  dependencies: TaskItem[]
): 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
  const descLength = task.description.length;
  const depCount = dependencies.length;
  const hasGuide = !!task.implementationGuide;
  const hasAnalysis = !!task.analysisResult;

  let score = 0;

  if (descLength > 1000) score += 2;
  else if (descLength > 500) score += 1;

  if (depCount > 5) score += 3;
  else if (depCount > 2) score += 2;
  else if (depCount > 0) score += 1;

  if (!hasGuide) score += 1;
  if (!hasAnalysis) score += 1;

  if (score >= 7) return 'VERY_HIGH';
  if (score >= 5) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  return 'LOW';
}

/**
 * Register plan_task tool
 *
 * Converts natural language task descriptions into structured task proposals.
 * Optionally references existing tasks for context.
 */
function registerPlanTask(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'plan_task',
    description:
      'Plan tasks and construct a structured task list. Converts natural language descriptions ' +
      'into actionable task proposals with goals and expected outcomes.',
    inputSchema: zodToJsonSchema(PlanTaskParamsSchema, 'PlanTaskParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = PlanTaskParamsSchema.parse(args) as PlanTaskParams;
      const { taskStore, logger } = container;

      logger.info({ description: params.description }, 'Planning task');

      // Load existing tasks if requested (provides context for planning)
      let existingPendingTasks: TaskItem[] = [];
      let existingCompletedTasks: TaskItem[] = [];

      if (params.existingTasksReference) {
        const allTasks = await taskStore.getAllAsync();
        existingPendingTasks = allTasks.filter((t) => t.status === 'pending');
        const completed = allTasks.filter((t) => t.status === 'completed');
        const sorted = completed.sort((a, b) => {
          const dateA = a.completedAt ? new Date(a.completedAt) : new Date(0);
          const dateB = b.completedAt ? new Date(b.completedAt) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        existingCompletedTasks = sorted.slice(0, 10); // Limit to last 10 completed tasks
      }

      // Build prompt using template
      const builder = new PlanTaskPromptBuilder();
      const result = await builder.build(
        params.description,
        params.requirements ?? undefined,
        params.existingTasksReference,
        existingCompletedTasks,
        existingPendingTasks,
        container.memoryStore['memoryDir'],
        container.rulesStore['rulesFilePath']
      );

      logger.info('Task planning complete');
      return result;
    },
  });
}

/**
 * Register analyze_task tool
 *
 * Performs deep analysis of task requirements with threat modeling,
 * design decisions, and implementation strategies.
 */
function registerAnalyzeTask(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'analyze_task',
    description:
      'Deeply analyze task requirements and propose a high-level approach. ' +
      'Includes threat modeling, design decisions, and architectural considerations.',
    inputSchema: zodToJsonSchema(AnalyzeTaskParamsSchema, 'AnalyzeTaskParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = AnalyzeTaskParamsSchema.parse(args) as AnalyzeTaskParams;
      const { logger } = container;

      logger.info({ summary: params.summary }, 'Analyzing task');

      // Build prompt for analysis workflow
      const builder = new AnalyzeTaskPromptBuilder();
      const result = await builder.build(
        params.summary,
        params.initialConcept,
        params.previousAnalysis ?? undefined
      );

      logger.info('Task analysis complete');
      return result;
    },
  });
}

/**
 * Register reflect_task tool
 *
 * Critically reviews analysis results and proposes optimizations.
 * Part of the analyze-reflect-implement cycle.
 */
function registerReflectTask(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'reflect_task',
    description:
      'Critically review analysis results and propose optimizations. ' +
      'Identifies potential issues, alternative approaches, and improvements.',
    inputSchema: zodToJsonSchema(ReflectTaskParamsSchema, 'ReflectTaskParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = ReflectTaskParamsSchema.parse(args) as ReflectTaskParams;
      const { logger } = container;

      logger.info({ summary: params.summary }, 'Reflecting on task');

      // Build prompt for reflection workflow
      const builder = new ReflectTaskPromptBuilder();
      const result = await builder.build(params.summary, params.analysis);

      logger.info('Task reflection complete');
      return result;
    },
  });
}

/**
 * Register split_tasks tool
 *
 * Creates multiple tasks in bulk with dependency management.
 * Supports various update modes: append, overwrite, selective, clearAllTasks.
 */
function registerSplitTasks(server: McpServer, container: ServiceContainer): void {
  server.registerTool({
    name: 'split_tasks',
    description:
      'Split a complex task into a structured set of smaller tasks. ' +
      'Supports bulk creation with dependency graphs and various update modes.',
    inputSchema: zodToJsonSchema(SplitTasksParamsSchema, 'SplitTasksParams') as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
    execute: async (args: unknown) => {
      const params = SplitTasksParamsSchema.parse(args) as SplitTasksParams;
      const { taskStore, logger } = container;

      logger.info(
        { updateMode: params.updateMode, taskCount: params.tasks.length },
        'Splitting tasks'
      );

      // Handle clear mode first
      if (params.updateMode === 'clearAllTasks') {
        await taskStore.clearAllAsync();
        logger.info('All tasks cleared');
      }

      // Load existing tasks for dependency resolution and overwrite mode
      const existingTasks = await taskStore.getAllAsync();
      const taskNameToId = new Map<string, string>();
      existingTasks.forEach((t) => taskNameToId.set(t.name, t.id));

      // Process tasks based on update mode
      const createdTasks: TaskItem[] = [];
      const now = new Date().toISOString();

      for (const taskParams of params.tasks) {
        const existingTaskId = taskNameToId.get(taskParams.name);

        // Overwrite mode: Update existing or create new
        if (params.updateMode === 'overwrite' && existingTaskId) {
          const updatedTask = await updateExistingTask(
            taskStore,
            existingTaskId,
            taskParams,
            taskNameToId,
            params.globalAnalysisResult ?? undefined
          );
          createdTasks.push(updatedTask);
          continue;
        }

        // Selective mode: Skip existing tasks
        if (params.updateMode === 'selective' && existingTaskId) {
          logger.debug({ taskName: taskParams.name }, 'Skipping existing task (selective mode)');
          continue;
        }

        // Append mode or new tasks: Create new task
        const newTaskRequest = createNewTask(
          taskParams,
          taskNameToId,
          params.globalAnalysisResult ?? undefined,
          now
        );
        const createdTask = await taskStore.createAsync(newTaskRequest);
        createdTasks.push(createdTask);

        // Add to mapping for dependency resolution within this batch
        taskNameToId.set(createdTask.name, createdTask.id);
      }

      // Build result prompt
      const allTasksAfter = await taskStore.getAllAsync();
      const builder = new SplitTasksPromptBuilder();
      const result = await builder.build(
        params.updateMode,
        createdTasks,
        allTasksAfter
      );

      logger.info({ createdCount: createdTasks.length }, 'Task split complete');
      return result;
    },
  });
}

/**
 * Create a new task from parameters
 *
 * @param params - Task creation parameters
 * @param taskNameToId - Mapping of task names to IDs for dependency resolution
 * @param globalAnalysisResult - Optional analysis result to attach
 * @param timestamp - Creation timestamp
 * @returns New task item
 */
function createNewTask(
  params: CreateTaskParams,
  _taskNameToId: Map<string, string>,
  globalAnalysisResult: string | undefined,
  _timestamp: string
): TaskCreateRequest {
  return {
    name: params.name,
    description: params.description,
    notes: params.notes ?? null,
    dependencies: params.dependencies ?? [],
    relatedFiles: params.relatedFiles ?? [],
    analysisResult: globalAnalysisResult ?? null,
    agent: params.agent ?? null,
    implementationGuide: params.implementationGuide ?? null,
    verificationCriteria: params.verificationCriteria ?? null,
  };
}

/**
 * Update an existing task with new parameters
 *
 * @param taskStore - Task store instance
 * @param taskId - ID of task to update
 * @param params - Update parameters
 * @param taskNameToId - Mapping for dependency resolution
 * @param globalAnalysisResult - Optional analysis result
 * @returns Updated task item
 */
async function updateExistingTask(
  taskStore: ServiceContainer['taskStore'],
  taskId: string,
  params: CreateTaskParams,
  _taskNameToId: Map<string, string>,
  globalAnalysisResult: string | undefined
): Promise<TaskItem> {
  const updates: TaskUpdateRequest = {
    description: params.description,
    notes: params.notes ?? undefined,
    dependencies: params.dependencies ?? [],
    relatedFiles: params.relatedFiles ?? [],
    analysisResult: globalAnalysisResult ?? undefined,
    agent: params.agent ?? undefined,
    implementationGuide: params.implementationGuide ?? undefined,
    verificationCriteria: params.verificationCriteria ?? undefined,
  };

  const updatedTask = await taskStore.updateAsync(taskId, updates);
  if (!updatedTask) {
    throw new Error(`Failed to update task ${taskId}`);
  }
  return updatedTask;
}


