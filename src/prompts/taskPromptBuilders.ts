/**
 * Prompt builders for task management tools.
 * Each builder generates formatted prompts by combining templates with runtime data.
 *
 * Architecture:
 * - Builder per tool (separation of concerns)
 * - Template loading via TemplateLoader (caching)
 * - Rendering via TemplateEngine (safe string replacement)
 * - Conditional rendering logic in code (not templates)
 *
 * @module prompts/taskPromptBuilders
 */

import type { TaskItem, TaskDependency } from '../data/schemas.js';
import { loadTemplate } from './templateLoader.js';
import { render } from './templateEngine.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncates text to max length with ellipsis.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

/**
 * Formats a timestamp in a human-readable format.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Converts task status string to serialized value (pass-through for now).
 */
function taskStatusToString(status: string): string {
  return status;
}

/**
 * Formats task dependencies as markdown list.
 */
function formatDependencies(dependencies: readonly TaskDependency[]): string {
  if (dependencies.length === 0) {
    return '';
  }
  const list = dependencies.map(dep => `\`${dep.taskId}\``).join(', ');
  return `   - dependencies: ${list}\n`;
}

// ============================================================================
// AnalyzeTaskPromptBuilder
// ============================================================================

export class AnalyzeTaskPromptBuilder {
  async build(
    summary: string,
    initialConcept: string,
    previousAnalysis?: string
  ): Promise<string> {
    const iterationPrompt = await this.buildIteration(previousAnalysis);
    const template = await loadTemplate('analyzeTask/index.md');

    return render(template, {
      summary,
      initialConcept,
      iterationPrompt
    });
  }

  private async buildIteration(previousAnalysis?: string): Promise<string> {
    if (!previousAnalysis || previousAnalysis.trim() === '') {
      return '';
    }

    const template = await loadTemplate('analyzeTask/iteration.md');
    return render(template, { previousAnalysis });
  }
}

// ============================================================================
// ReflectTaskPromptBuilder
// ============================================================================

export class ReflectTaskPromptBuilder {
  async build(summary: string, analysis: string): Promise<string> {
    const template = await loadTemplate('reflectTask/index.md');
    return render(template, { summary, analysis });
  }
}

// ============================================================================
// PlanTaskPromptBuilder
// ============================================================================

export class PlanTaskPromptBuilder {
  private static readonly COMPLETED_TASK_LIMIT = 10;

  async build(
    description: string,
    requirements: string | undefined,
    existingTasksReference: boolean,
    completedTasks: readonly TaskItem[],
    pendingTasks: readonly TaskItem[],
    memoryDir: string,
    rulesPath: string
  ): Promise<string> {
    const tasksTemplate = await this.buildTasksTemplate(
      existingTasksReference,
      completedTasks,
      pendingTasks
    );
    const thoughtTemplate = await this.loadThoughtTemplate();
    const template = await loadTemplate('planTask/index.md');

    return render(template, {
      description,
      requirements: requirements || 'No requirements',
      tasksTemplate,
      rulesPath,
      memoryDir,
      thoughtTemplate
    });
  }

  private async buildTasksTemplate(
    existingTasksReference: boolean,
    completedTasks: readonly TaskItem[],
    pendingTasks: readonly TaskItem[]
  ): Promise<string> {
    if (!existingTasksReference) {
      return '';
    }

    const totalCount = completedTasks.length + pendingTasks.length;
    if (totalCount === 0) {
      return '';
    }

    const template = await loadTemplate('planTask/tasks.md');
    return render(template, {
      completedTasks: this.buildCompletedTasksContent(completedTasks),
      unfinishedTasks: this.buildPendingTasksContent(pendingTasks)
    });
  }

  private buildCompletedTasksContent(completedTasks: readonly TaskItem[]): string {
    if (completedTasks.length === 0) {
      return 'no completed tasks';
    }

    const limit = PlanTaskPromptBuilder.COMPLETED_TASK_LIMIT;
    const tasksToShow = completedTasks.slice(0, limit);
    const items = tasksToShow.map((task, index) =>
      this.formatCompletedTask(index + 1, task)
    );

    let content = items.join('\n\n');
    if (completedTasks.length > limit) {
      content += `\n\n*(showing first ${limit} of ${completedTasks.length})*\n`;
    }

    return content;
  }

  private buildPendingTasksContent(pendingTasks: readonly TaskItem[]): string {
    if (pendingTasks.length === 0) {
      return 'no pending tasks';
    }

    const items = pendingTasks.map((task, index) =>
      this.formatPendingTask(index + 1, task)
    );
    return items.join('\n\n');
  }

  private formatCompletedTask(index: number, task: TaskItem): string {
    const description = truncate(task.description, 100);
    const completedAt = task.completedAt
      ? `   - completedAt: ${formatDate(task.completedAt)}\n`
      : '';

    return `${index}. **${task.name}** (ID: \`${task.id}\`)\n   - description: ${description}\n${completedAt}`;
  }

  private formatPendingTask(index: number, task: TaskItem): string {
    const description = truncate(task.description, 150);
    const dependencies = formatDependencies(task.dependencies);

    return (
      `${index}. **${task.name}** (ID: \`${task.id}\`)\n` +
      `   - description: ${description}\n` +
      `   - status: ${taskStatusToString(task.status)}\n` +
      `${dependencies}`
    );
  }

  private async loadThoughtTemplate(): Promise<string> {
    const thoughtEnabled = process.env['ENABLE_THOUGHT_CHAIN'];
    const templatePath = thoughtEnabled?.toLowerCase() === 'false'
      ? 'planTask/noThought.md'
      : 'planTask/hasThought.md';

    return await loadTemplate(templatePath);
  }
}

// ============================================================================
// SplitTasksPromptBuilder
// ============================================================================

export class SplitTasksPromptBuilder {
  async build(
    updateMode: string,
    createdTasks: readonly TaskItem[],
    allTasks: readonly TaskItem[]
  ): Promise<string> {
    const taskDetailsTemplate = await loadTemplate('splitTasks/taskDetails.md');
    const tasksContent = this.buildTasksContent(
      taskDetailsTemplate,
      createdTasks,
      allTasks
    );
    const indexTemplate = await loadTemplate('splitTasks/index.md');

    return render(indexTemplate, {
      updateMode,
      tasksContent
    });
  }

  private buildTasksContent(
    taskDetailsTemplate: string,
    createdTasks: readonly TaskItem[],
    allTasks: readonly TaskItem[]
  ): string {
    const items = createdTasks.map((task, index) => {
      const taskData = {
        index: index + 1,
        id: task.id,
        name: task.name,
        description: task.description,
        dependencies: this.formatTaskDependencies(task.dependencies, allTasks),
        implementationGuide: task.implementationGuide || '',
        verificationCriteria: task.verificationCriteria || '',
        notes: task.notes || ''
      };

      return render(taskDetailsTemplate, taskData);
    });

    return items.join('\n\n');
  }

  private formatTaskDependencies(
    dependencies: readonly TaskDependency[],
    allTasks: readonly TaskItem[]
  ): string {
    if (dependencies.length === 0) {
      return 'none';
    }

    return dependencies
      .map(dep => {
        const task = allTasks.find(t => t.id === dep.taskId);
        return task ? `\`${task.name}\`` : `\`${dep.taskId}\``;
      })
      .join(', ');
  }
}

// ============================================================================
// ListTasksPromptBuilder
// ============================================================================

export class ListTasksPromptBuilder {
  async build(
    tasks: readonly TaskItem[],
    statusFilter?: string
  ): Promise<string> {
    const statusCounts = this.calculateStatusCounts(tasks);
    const tasksByStatus = this.groupTasksByStatus(tasks, statusFilter);
    const taskDetailsTemplate = await this.buildTaskDetails(tasksByStatus);
    const template = await loadTemplate('listTasks/index.md');

    return render(template, {
      statusCount: this.formatStatusCounts(statusCounts),
      taskDetailsTemplate
    });
  }

  private calculateStatusCounts(tasks: readonly TaskItem[]): Record<string, number> {
    const counts: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0
    };

    for (const task of tasks) {
      const status = taskStatusToString(task.status);
      if (status in counts) {
        counts[status]!++;
      }
    }

    return counts;
  }

  private groupTasksByStatus(
    tasks: readonly TaskItem[],
    statusFilter?: string
  ): readonly TaskItem[] {
    if (statusFilter !== undefined) {
      return tasks.filter(t => t.status === statusFilter);
    }
    return tasks;
  }

  private formatStatusCounts(counts: Record<string, number>): string {
    return Object.entries(counts)
      .map(([status, count]) => `- **${status}**: ${count} tasks`)
      .join('\n');
  }

  private async buildTaskDetails(tasks: readonly TaskItem[]): Promise<string> {
    if (tasks.length === 0) {
      return 'No tasks found.';
    }

    const items: string[] = [];
    for (const task of tasks) {
      const summary = truncate(task.description, 200);
      const deps = task.dependencies.length > 0
        ? `\n\n**Dependencies:** ${formatDependencies(task.dependencies)}`
        : '';
      const completed = task.completedAt
        ? `\n\n**Completed:** ${formatDate(task.completedAt)}`
        : '';

      items.push(
        `### ${task.name}\n\n` +
        `**ID:** \`${task.id}\`\n\n` +
        `**Description:** ${summary}\n\n` +
        `${deps}${completed}\n\n` +
        `**Creation Time:** ${formatDate(task.createdAt)}\n`
      );
    }

    return items.join('\n\n');
  }
}

// ============================================================================
// QueryTaskPromptBuilder
// ============================================================================

export class QueryTaskPromptBuilder {
  async build(
    query: string,
    tasks: readonly TaskItem[],
    page: number,
    pageSize: number,
    totalTasks: number
  ): Promise<string> {
    const totalPages = Math.ceil(totalTasks / pageSize);
    const tasksContent = await this.buildTasksContent(tasks);
    const template = await loadTemplate('queryTask/index.md');

    return render(template, {
      query,
      tasksContent,
      page,
      pageSize,
      totalPages,
      totalTasks
    });
  }

  private async buildTasksContent(tasks: readonly TaskItem[]): Promise<string> {
    if (tasks.length === 0) {
      return 'No tasks found matching the query.';
    }

    const items = tasks.map(task => {
      const summary = truncate(task.description, 150);
      return (
        `### ${task.name} (ID: ${task.id})\n\n` +
        `- Status: ${taskStatusToString(task.status)}\n` +
        `- Description: ${summary}\n` +
        `- Creation Time: ${formatDate(task.createdAt)}\n`
      );
    });

    return items.join('\n\n');
  }
}

// ============================================================================
// GetTaskDetailPromptBuilder
// ============================================================================

export class GetTaskDetailPromptBuilder {
  async build(task: TaskItem, allTasks: readonly TaskItem[]): Promise<string> {
    const template = await loadTemplate('getTaskDetail/index.md');

    return render(template, {
      id: task.id,
      name: task.name,
      description: task.description,
      dependenciesPrompt: await this.buildDependenciesPrompt(task.dependencies, allTasks),
      implementationGuidePrompt: this.buildImplementationGuidePrompt(task.implementationGuide ?? undefined),
      verificationCriteriaPrompt: this.buildVerificationCriteriaPrompt(task.verificationCriteria ?? undefined),
      notesPrompt: this.buildNotesPrompt(task.notes ?? undefined),
      relatedFilesSummaryPrompt: await this.buildRelatedFilesPrompt(task.relatedFiles as any),
      completedSummaryPrompt: await this.buildCompletedSummaryPrompt(task)
    });
  }

  private async buildDependenciesPrompt(
    dependencies: readonly TaskDependency[],
    allTasks: readonly TaskItem[]
  ): Promise<string> {
    if (dependencies.length === 0) {
      return '';
    }

    const template = await loadTemplate('getTaskDetail/dependencies.md');
    const depTasks = dependencies
      .map(dep => allTasks.find(t => t.id === dep.taskId))
      .filter((t): t is TaskItem => t !== undefined);

    const list = depTasks.map(t => `\`${t.id}\``).join(', ');
    return render(template, { dependencies: list });
  }

  private buildImplementationGuidePrompt(guide?: string): string {
    return guide ? `\n\n**Implementation Guide:**\n\n${guide}\n` : '';
  }

  private buildVerificationCriteriaPrompt(criteria?: string): string {
    return criteria ? `\n\n**Verification Criteria:**\n\n${criteria}\n` : '';
  }

  private buildNotesPrompt(notes?: string): string {
    return notes ? `\n\n**Notes:** ${notes}\n` : '';
  }

  private async buildRelatedFilesPrompt(
    relatedFiles: readonly { path: string; type: string; description?: string }[]
  ): Promise<string> {
    if (relatedFiles.length === 0) {
      return '';
    }

    const template = await loadTemplate('getTaskDetail/relatedFiles.md');
    const grouped = this.groupFilesByType(relatedFiles);
    const filesList = Object.entries(grouped)
      .map(([type, files]) => {
        const paths = files.map(f => `\`${f.path}\``).join(', ');
        return `- **${type}**: ${paths}`;
      })
      .join('\n');

    return render(template, { filesList });
  }

  private groupFilesByType(
    files: readonly { path: string; type: string; description?: string }[]
  ): Record<string, Array<{ path: string; type: string; description?: string }>> {
    const grouped: Record<string, Array<{ path: string; type: string; description?: string }>> = {};
    for (const file of files) {
      if (!grouped[file.type]) {
        grouped[file.type] = [];
      }
      grouped[file.type]!.push(file);
    }
    return grouped;
  }

  private async buildCompletedSummaryPrompt(task: TaskItem): Promise<string> {
    if (!task.completedAt) {
      return '';
    }

    const template = await loadTemplate('getTaskDetail/completed.md');
    return render(template, {
      completedAt: formatDate(task.completedAt),
      completedSummary: task.summary || 'No summary provided'
    });
  }
}

// ============================================================================
// ExecuteTaskPromptBuilder
// ============================================================================

export class ExecuteTaskPromptBuilder {
  async build(
    task: TaskItem,
    dependencyTasks: readonly TaskItem[],
    complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH',
    analysisResult?: string
  ): Promise<string> {
    const dependencyTasksTemplate = await this.buildDependencyTasksTemplate(dependencyTasks);
    const complexityTemplate = await this.buildComplexityTemplate(complexity);
    const analysisResultTemplate = this.buildAnalysisResultTemplate(analysisResult);
    const template = await loadTemplate('executeTask/index.md');

    return render(template, {
      id: task.id,
      name: task.name,
      description: task.description,
      dependencyTasksTemplate,
      implementationGuideTemplate: task.implementationGuide || '',
      verificationCriteriaTemplate: task.verificationCriteria || '',
      notesTemplate: task.notes || '',
      relatedFilesSummaryTemplate: this.buildRelatedFilesSection(task.relatedFiles as any),
      complexityTemplate,
      analysisResultTemplate
    });
  }

  private async buildDependencyTasksTemplate(tasks: readonly TaskItem[]): Promise<string> {
    if (tasks.length === 0) {
      return '';
    }

    const template = await loadTemplate('executeTask/dependencies.md');
    const list = tasks.map(t => `\`${t.id}\``).join(', ');
    return render(template, { dependencies: list });
  }

  private async buildComplexityTemplate(
    complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  ): Promise<string> {
    const levelLabels = {
      LOW: 'low',
      MEDIUM: 'moderate',
      HIGH: 'high',
      VERY_HIGH: 'extremely complex'
    };

    const template = await loadTemplate('executeTask/complexity.md');
    return render(template, {
      level: levelLabels[complexity],
      recommendation: this.getComplexityRecommendation(complexity)
    });
  }

  private getComplexityRecommendation(complexity: string): string {
    if (complexity === 'MEDIUM') {
      return 'TIP: This task has moderate complexity.';
    } else if (complexity === 'HIGH') {
      return 'WARNING: This task has high complexity.';
    } else if (complexity === 'VERY_HIGH') {
      return 'WARNING: This task is extremely complex.';
    }
    return '';
  }

  private buildAnalysisResultTemplate(analysisResult?: string): string {
    return analysisResult ? `\n\n## Analysis Background\n\n${analysisResult}\n` : '';
  }

  private buildRelatedFilesSection(
    files: readonly { path: string; type: string; description?: string }[]
  ): string {
    if (files.length === 0) {
      return '';
    }

    return files.map(f => `- \`${f.path}\` (${f.type})`).join('\n');
  }
}

// ============================================================================
// VerifyTaskPromptBuilder
// ============================================================================

export class VerifyTaskPromptBuilder {
  async build(task: TaskItem): Promise<string> {
    const template = await loadTemplate('verifyTask/index.md');

    return render(template, {
      taskId: task.id,
      taskName: task.name,
      taskDescription: task.description
    });
  }
}

// ============================================================================
// UpdateTaskPromptBuilder
// ============================================================================

export class UpdateTaskPromptBuilder {
  async buildResult(
    task: TaskItem,
    updatedFields: string[]
  ): Promise<string> {
    const successDetails = await this.buildSuccessDetails(updatedFields);
    const relatedFilesContent = this.buildRelatedFilesContent(task.relatedFiles as any);
    const template = await loadTemplate('updateTaskContent/index.md');

    return render(template, {
      taskId: task.id,
      taskName: task.name,
      successDetails,
      relatedFilesContent
    });
  }

  async buildNotFound(taskId: string): Promise<string> {
    const template = await loadTemplate('updateTaskContent/notFound.md');
    return render(template, { taskId });
  }

  async buildEmptyUpdate(): Promise<string> {
    return await loadTemplate('updateTaskContent/emptyUpdate.md');
  }

  async buildValidation(errors: string[]): Promise<string> {
    const template = await loadTemplate('updateTaskContent/validation.md');
    return render(template, { errors: errors.join('\n') });
  }

  private async buildSuccessDetails(fields: string[]): Promise<string> {
    const template = await loadTemplate('updateTaskContent/successDetails.md');
    const fieldsList = fields.map(f => `- ${f}`).join('\n');
    return render(template, { fields: fieldsList });
  }

  private buildRelatedFilesContent(
    files: readonly { path: string; type: string; description?: string }[]
  ): string {
    if (files.length === 0) {
      return '';
    }

    return '\n\n**Related Files:**\n' +
      files.map(f => `- \`${f.path}\` (${f.type})`).join('\n');
  }
}

// ============================================================================
// DeleteTaskPromptBuilder
// ============================================================================

export class DeleteTaskPromptBuilder {
  async buildResult(taskName: string): Promise<string> {
    const template = await loadTemplate('deleteTask/result.md');
    return render(template, { taskName });
  }

  async buildNotFound(taskId: string): Promise<string> {
    const template = await loadTemplate('deleteTask/notFound.md');
    return render(template, { taskId });
  }

  async buildCompleted(taskId: string): Promise<string> {
    const template = await loadTemplate('deleteTask/completed.md');
    return render(template, { taskId });
  }
}

// ============================================================================
// ClearAllTasksPromptBuilder
// ============================================================================

export class ClearAllTasksPromptBuilder {
  async buildResult(
    deletedCount: number,
    backupPath: string
  ): Promise<string> {
    const backupInfo = await this.buildBackupInfo(backupPath);
    const template = await loadTemplate('clearAllTasks/result.md');

    return render(template, {
      count: deletedCount,
      backupInfo
    });
  }

  async buildEmpty(): Promise<string> {
    return await loadTemplate('clearAllTasks/empty.md');
  }

  async buildCancel(): Promise<string> {
    return await loadTemplate('clearAllTasks/cancel.md');
  }

  private async buildBackupInfo(backupPath: string): Promise<string> {
    const template = await loadTemplate('clearAllTasks/backupInfo.md');
    return render(template, { backupPath });
  }
}
