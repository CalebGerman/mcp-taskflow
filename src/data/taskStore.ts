/**
 * TaskStore - CRUD operations for task management
 *
 * Provides thread-safe task operations with:
 * - Atomic read-modify-write pattern
 * - Dependency resolution (by ID or name)
 * - Automatic timestamp management
 * - Event notifications
 */

import {
  writeJsonFile,
  readJsonFileOrDefault,
} from './fileOperations.js';
import {
  type TaskDocument,
  TaskDocumentSchema,
  type TaskItem,
  TaskItemSchema,
  type TaskDependency,
} from './schemas.js';
import { getDataPath } from '../config/pathResolver.js';
import { randomUUID } from 'crypto';

/**
 * Related file type enumeration
 */
export type RelatedFileType = 'TO_MODIFY' | 'REFERENCE' | 'CREATE' | 'DEPENDENCY' | 'OTHER';

/**
 * Related file information for a task
 */
export interface RelatedFileInfo {
  path: string;
  type: RelatedFileType;
  description?: string | null;
  lineStart?: number | null;
  lineEnd?: number | null;
}

/**
 * Fields that can be set when creating a task
 * Excludes auto-generated fields (id, timestamps, status, summary)
 */
type TaskCreatableFields = Pick<
  TaskItem,
  | 'name'
  | 'description'
  | 'notes'
  | 'analysisResult'
  | 'agent'
  | 'implementationGuide'
  | 'verificationCriteria'
>;

/**
 * Request to create a new task
 *
 * Allows creating a task with user-provided fields.
 * Dependencies can be specified by ID or name (resolved at creation time).
 */
export interface TaskCreateRequest extends TaskCreatableFields {
  /** Task dependencies (IDs or names) */
  dependencies?: string[];
  /** Related files for the task */
  relatedFiles?: RelatedFileInfo[];
}

/**
 * Fields that can be updated on an existing task
 * All fields are optional and nullable (undefined = keep existing, null = clear)
 */
type TaskUpdatableFields = Partial<
  Pick<
    TaskItem,
    | 'name'
    | 'description'
    | 'notes'
    | 'status'
    | 'summary'
    | 'analysisResult'
    | 'agent'
    | 'implementationGuide'
    | 'verificationCriteria'
  >
>;

/**
 * Request to update an existing task
 *
 * Three-way null handling:
 * - `undefined` (field omitted) = keep existing value
 * - `null` = clear the field
 * - value = update to new value
 */
export interface TaskUpdateRequest extends TaskUpdatableFields {
  /** Updated dependencies (IDs or names), or null to clear */
  dependencies?: string[] | null;
  /** Updated related files, or null to clear */
  relatedFiles?: RelatedFileInfo[] | null;
}

/**
 * Result of clearing all tasks
 */
export interface ClearAllResult {
  success: boolean;
  message: string;
  backupFile?: string | null;
}

/**
 * Task change event types
 */
export type TaskChangeEvent =
  | { type: 'created'; task: TaskItem }
  | { type: 'updated'; task: TaskItem }
  | { type: 'deleted'; task: TaskItem }
  | { type: 'cleared' };

/**
 * Task change event handler
 */
export type TaskChangeHandler = (event: TaskChangeEvent) => void;

/**
 * TaskStore - Main storage for task data
 *
 * This class provides CRUD operations with:
 * - Atomic file operations to prevent corruption
 * - Dependency resolution (supports both task IDs and task names)
 * - Automatic timestamp management
 * - Event notifications for changes
 */
export class TaskStore {
  private readonly tasksFilePath: string;
  private readonly handlers: TaskChangeHandler[] = [];

  /**
   * Create a new TaskStore
   *
   * @param dataDir - Optional data directory override (for testing)
   */
  constructor(dataDir?: string) {
    this.tasksFilePath = getDataPath('tasks.json', dataDir);
  }

  /**
   * Subscribe to task change events
   *
   * @param handler - Function to call when tasks change
   * @returns Unsubscribe function
   */
  public onTaskChanged(handler: TaskChangeHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index >= 0) {
        this.handlers.splice(index, 1);
      }
    };
  }

  /**
   * Get all tasks
   *
   * @returns Array of all tasks
   */
  public async getAllAsync(): Promise<TaskItem[]> {
    const document = await this.readDocumentAsync();
    return document.tasks;
  }

  /**
   * Get a single task by ID
   *
   * @param taskId - UUID of the task
   * @returns Task if found, null otherwise
   */
  public async getByIdAsync(taskId: string): Promise<TaskItem | null> {
    const document = await this.readDocumentAsync();
    return document.tasks.find(task => task.id === taskId) ?? null;
  }

  /**
   * Create a new task
   *
   * @param request - Task creation data
   * @returns Newly created task
   */
  public async createAsync(request: TaskCreateRequest): Promise<TaskItem> {
    const document = await this.readDocumentAsync();
    const now = new Date().toISOString();

    const task: TaskItem = {
      id: randomUUID(),
      name: request.name,
      description: request.description,
      notes: request.notes ?? null,
      status: 'pending',
      dependencies: this.toDependencies(request.dependencies ?? [], document.tasks),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      summary: null,
      relatedFiles: request.relatedFiles ?? [],
      analysisResult: request.analysisResult ?? null,
      agent: request.agent ?? null,
      implementationGuide: request.implementationGuide ?? null,
      verificationCriteria: request.verificationCriteria ?? null,
    };

    // Validate the task matches schema
    TaskItemSchema.parse(task);

    const updatedDocument: TaskDocument = {
      version: document.version,
      tasks: [...document.tasks, task],
    };

    await this.writeDocumentAsync(updatedDocument);
    this.notifyHandlers({ type: 'created', task });
    return task;
  }

  /**
   * Update an existing task
   *
   * @param taskId - UUID of the task to update
   * @param request - Update data
   * @returns Updated task if found, null otherwise
   */
  public async updateAsync(
    taskId: string,
    request: TaskUpdateRequest
  ): Promise<TaskItem | null> {
    const document = await this.readDocumentAsync();
    const index = this.findTaskIndex(document.tasks, taskId);

    if (index < 0) {
      return null;
    }

    const now = new Date().toISOString();
    // eslint-disable-next-line security/detect-object-injection
    const existing = document.tasks[index]!; // Safe: index validated above
    const updated = this.applyUpdates(existing, request, now, document.tasks);

    const updatedTasks = [...document.tasks];
    // eslint-disable-next-line security/detect-object-injection
    updatedTasks[index] = updated;

    const updatedDocument: TaskDocument = {
      version: document.version,
      tasks: updatedTasks,
    };

    await this.writeDocumentAsync(updatedDocument);
    this.notifyHandlers({ type: 'updated', task: updated });
    return updated;
  }

  /**
   * Delete a task by ID
   *
   * @param taskId - UUID of the task to delete
   * @returns True if deleted, false if not found
   */
  public async deleteAsync(taskId: string): Promise<boolean> {
    const document = await this.readDocumentAsync();
    const index = this.findTaskIndex(document.tasks, taskId);

    if (index < 0) {
      return false;
    }

    // eslint-disable-next-line security/detect-object-injection
    const deletedTask = document.tasks[index]!; // Safe: index validated above
    const updatedTasks = [...document.tasks];
    updatedTasks.splice(index, 1);

    const updatedDocument: TaskDocument = {
      version: document.version,
      tasks: updatedTasks,
    };

    await this.writeDocumentAsync(updatedDocument);
    this.notifyHandlers({ type: 'deleted', task: deletedTask });
    return true;
  }

  /**
   * Clear all tasks (with backup of completed tasks)
   *
   * @returns Result with backup file path
   */
  public async clearAllAsync(): Promise<ClearAllResult> {
    const document = await this.readDocumentAsync();

    if (document.tasks.length === 0) {
      return {
        success: true,
        message: 'No tasks to clear.',
        backupFile: null,
      };
    }

    // TODO: Implement backup functionality when MemoryStore is available
    // For now, just clear tasks
    const emptyDocument: TaskDocument = {
      version: '1.0',
      tasks: [],
    };

    await this.writeDocumentAsync(emptyDocument);
    this.notifyHandlers({ type: 'cleared' });

    return {
      success: true,
      message: `Cleared ${document.tasks.length} task(s).`,
      backupFile: null,
    };
  }

  /**
   * Read task document from disk
   * Creates empty document if file doesn't exist
   */
  private async readDocumentAsync(): Promise<TaskDocument> {
    const defaultDocument: TaskDocument = {
      version: '1.0',
      tasks: [],
    };

    const document = await readJsonFileOrDefault(
      this.tasksFilePath,
      TaskDocumentSchema,
      defaultDocument
    );

    // Schema defaults ensure arrays are never undefined, but TypeScript needs assertion
    return document as TaskDocument;
  }

  /**
   * Write task document to disk atomically
   */
  private async writeDocumentAsync(document: TaskDocument): Promise<void> {
    await writeJsonFile(this.tasksFilePath, document, TaskDocumentSchema);
  }

  /**
   * Find task index by ID
   */
  private findTaskIndex(tasks: TaskItem[], taskId: string): number {
    return tasks.findIndex(task => task.id === taskId);
  }

  /**
   * Apply updates to an existing task
   * Handles status transitions and automatic timestamp management
   */
  private applyUpdates(
    existing: TaskItem,
    request: TaskUpdateRequest,
    now: string,
    allTasks: TaskItem[]
  ): TaskItem {
    const status = request.status ?? existing.status;
    const completedAt = status === 'completed'
      ? (existing.completedAt ?? now)
      : null;

    const updated: TaskItem = {
      ...existing,
      name: request.name ?? existing.name,
      description: request.description ?? existing.description,
      notes: request.notes !== undefined ? request.notes : existing.notes,
      status,
      dependencies: request.dependencies !== undefined
        ? this.toDependencies(request.dependencies ?? [], allTasks)
        : existing.dependencies,
      relatedFiles: request.relatedFiles ?? existing.relatedFiles,
      summary: request.summary !== undefined ? request.summary : existing.summary,
      analysisResult: request.analysisResult !== undefined
        ? request.analysisResult
        : existing.analysisResult,
      agent: request.agent !== undefined ? request.agent : existing.agent,
      implementationGuide: request.implementationGuide !== undefined
        ? request.implementationGuide
        : existing.implementationGuide,
      verificationCriteria: request.verificationCriteria !== undefined
        ? request.verificationCriteria
        : existing.verificationCriteria,
      updatedAt: now,
      completedAt,
    };

    // Validate updated task
    TaskItemSchema.parse(updated);
    return updated;
  }

  /**
   * Convert dependency strings to TaskDependency objects
   * Supports both task IDs (UUIDs) and task names
   *
   * Resolution logic:
   * 1. Try exact UUID match
   * 2. Try case-sensitive name match
   * 3. Skip if no match found
   */
  private toDependencies(
    dependencyStrings: string[],
    allTasks: TaskItem[]
  ): TaskDependency[] {
    const dependencies: TaskDependency[] = [];

    for (const depStr of dependencyStrings) {
      if (!depStr || depStr.trim().length === 0) {
        continue;
      }

      const trimmed = depStr.trim();

      // Try UUID match first (exact ID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(trimmed)) {
        const taskById = allTasks.find(t => t.id === trimmed);
        if (taskById) {
          dependencies.push({ taskId: taskById.id });
          continue;
        }
      }

      // Try name match (case-sensitive)
      const taskByName = allTasks.find(t => t.name === trimmed);
      if (taskByName) {
        dependencies.push({ taskId: taskByName.id });
        continue;
      }

      // If no match found, skip this dependency
      // This prevents invalid dependencies from being created
    }

    return dependencies;
  }

  /**
   * Notify all registered handlers of a task change
   */
  private notifyHandlers(event: TaskChangeEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        // Don't let handler errors break the store
        console.error('Error in task change handler:', error);
      }
    }
  }
}
