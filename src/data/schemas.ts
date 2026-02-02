/**
 * Zod schemas for runtime validation
 *
 * These schemas validate all external input from MCP clients.
 * TypeScript types alone provide no runtime protection!
 */

import { z } from 'zod';

/**
 * Task status validation
 * Allowlist validation - only these 4 values permitted.
 */
export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked']);

/**
 * Task dependency schema
 * Matches C# TaskDependency record (TaskId only)
 * NOTE: The 'name' field is computed at runtime for display purposes
 */
export const TaskDependencySchema = z.object({
  taskId: z.string().uuid(),              // Validate GUID format to prevent injection
});

/**
 * Related file type enum
 * Allowlist validation - only permitted file relationship types.
 */
export const RelatedFileTypeSchema = z.enum(['TO_MODIFY', 'REFERENCE', 'CREATE', 'DEPENDENCY', 'OTHER']);

/**
 * Related file schema
 * Note: Paths will be sanitized separately before file operations.
 */
export const RelatedFileSchema = z.object({
  path: z.string().min(1).max(1000),  // Max path length prevents DoS
  type: RelatedFileTypeSchema,
  description: z.string().max(1000).optional().nullable(),
  lineStart: z.number().int().min(1).optional().nullable(),
  lineEnd: z.number().int().min(1).optional().nullable(),
});

/**
 * Main task item schema
 * Validates all task fields with strict limits to prevent malformed data.
 */
export const TaskItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Task name cannot be empty').max(500, 'Task name too long'),
  description: z.string().max(5000, 'Description too long'),
  notes: z.string().max(5000).optional().nullable(),
  status: TaskStatusSchema,
  dependencies: z.array(TaskDependencySchema).default([]),
  createdAt: z.string().datetime(), // ISO 8601 format - matches C# DateTimeOffset
  updatedAt: z.string().datetime(), // ISO 8601 format
  completedAt: z.string().datetime().optional().nullable(), // C# DateTimeOffset?
  summary: z.string().max(5000).optional().nullable(), // C# string? Summary
  relatedFiles: z.array(RelatedFileSchema).default([]),
  analysisResult: z.string().max(20000).optional().nullable(), // C# string? AnalysisResult
  agent: z.string().max(200).optional().nullable(),
  implementationGuide: z.string().max(10000).optional().nullable(),
  verificationCriteria: z.string().max(5000).optional().nullable(),
});

/**
 * Task document schema (root JSON structure)
 * Version field used for schema migration support.
 */
export const TaskDocumentSchema = z.object({
  version: z.string().regex(/^\d+\.\d+$/, 'Version must be format X.Y'),
  tasks: z.array(TaskItemSchema).default([]),
});

/**
 * Update mode validation
 */
export const UpdateModeSchema = z.enum(['append', 'overwrite', 'selective', 'clearAllTasks']);

// ============================================================================
// MCP Tool Parameter Schemas (Input Validation)
// ============================================================================

/**
 * create_task / plan_task parameters
 * Strict validation on input to ensure data integrity.
 */
export const CreateTaskParamsSchema = z.object({
  name: z.string()
    .min(1, 'Task name required')
    .max(500, 'Task name exceeds maximum length of 500 characters'),
  description: z.string()
    .min(1, 'Task description required')
    .max(5000, 'Description exceeds maximum length of 5000 characters'),
  dependencies: z.array(z.string().max(500)).optional(),
  relatedFiles: z.array(RelatedFileSchema).optional(),
  implementationGuide: z.string().max(10000).optional().nullable(),
  verificationCriteria: z.string().max(5000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  agent: z.string().max(200).optional().nullable(),
});

/**
 * update_task parameters
 * Validates task ID is GUID, all fields optional for partial update.
 */
export const UpdateTaskParamsSchema = z.object({
  taskId: z.string().uuid('Task ID must be a valid GUID'),
  name: z.string().min(1).max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  dependencies: z.array(z.string().max(500)).optional().nullable(),
  relatedFiles: z.array(RelatedFileSchema).optional().nullable(),
  implementationGuide: z.string().max(10000).optional().nullable(),
  verificationCriteria: z.string().max(5000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

/**
 * split_tasks parameters
 * Validates array of tasks and update mode.
 */
export const SplitTasksParamsSchema = z.object({
  updateMode: UpdateModeSchema,
  tasks: z.array(CreateTaskParamsSchema)
    .min(1, 'At least one task required')
    .max(100, 'Maximum 100 tasks per split operation'),
  globalAnalysisResult: z.string().max(20000).optional().nullable(),
});

/**
 * list_tasks parameters
 */
export const ListTasksParamsSchema = z.object({
  status: z.enum(['all', 'pending', 'in_progress', 'completed', 'blocked']).default('all'),
});

/**
 * query_task parameters
 * Pagination limits prevent excessive result sets.
 */
export const QueryTaskParamsSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(500),
  isId: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10), // Max 100 per page prevents DoS
});

/**
 * get_task_detail parameters
 */
export const GetTaskDetailParamsSchema = z.object({
  taskId: z.string().uuid('Task ID must be a valid GUID'),
});

/**
 * execute_task parameters
 */
export const ExecuteTaskParamsSchema = z.object({
  taskId: z.string().uuid('Task ID must be a valid GUID'),
});

/**
 * verify_task parameters
 */
export const VerifyTaskParamsSchema = z.object({
  taskId: z.string().uuid('Task ID must be a valid GUID'),
  score: z.number().int().min(0).max(100, 'Score must be between 0-100'),
  summary: z.string().min(1).max(2000),
});

/**
 * delete_task parameters
 */
export const DeleteTaskParamsSchema = z.object({
  taskId: z.string().uuid('Task ID must be a valid GUID'),
});

/**
 * clear_all_tasks parameters
 */
export const ClearAllTasksParamsSchema = z.object({
  confirm: z.boolean().default(false),
});

/**
 * analyze_task parameters
 */
export const AnalyzeTaskParamsSchema = z.object({
  summary: z.string().min(1).max(5000, 'Summary exceeds maximum length'),
  initialConcept: z.string().min(1).max(20000, 'Initial concept exceeds maximum length'),
  previousAnalysis: z.string().max(20000).optional().nullable(),
});

/**
 * reflect_task parameters
 */
export const ReflectTaskParamsSchema = z.object({
  summary: z.string().min(1).max(5000, 'Summary exceeds maximum length'),
  analysis: z.string().min(1).max(20000, 'Analysis exceeds maximum length'),
});

/**
 * plan_task parameters
 */
export const PlanTaskParamsSchema = z.object({
  description: z.string().min(1, 'Description required').max(10000),
  requirements: z.string().max(10000).optional().nullable(),
  existingTasksReference: z.boolean().default(false),
});

/**
 * research_mode parameters
 */
export const ResearchModeParamsSchema = z.object({
  topic: z.string().min(1, 'Topic required').max(1000),
  previousState: z.string().max(20000),
  currentState: z.string().min(1, 'Current state required').max(20000),
  nextSteps: z.string().min(1, 'Next steps required').max(20000),
});

/**
 * process_thought parameters
 */
export const ProcessThoughtParamsSchema = z.object({
  thought: z.string().min(1, 'Thought content required').max(5000),
  thoughtNumber: z.number().int().min(1),
  totalThoughts: z.number().int().min(1),
  stage: z.string().min(1).max(100),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
  axiomsUsed: z.array(z.string().max(200)).max(10).optional().nullable(),
  assumptionsChallenged: z.array(z.string().max(200)).max(10).optional().nullable(),
  nextThoughtNeeded: z.boolean().default(false),
}).refine(data => data.thoughtNumber <= data.totalThoughts, {
  message: 'Thought number cannot exceed total thoughts',
  path: ['thoughtNumber'],
});

/**
 * init_project_rules parameters
 */
export const InitProjectRulesParamsSchema = z.object({
  // No parameters - this tool initializes default rules
});

/**
 * get_server_info parameters
 */
export const GetServerInfoParamsSchema = z.object({
  // No parameters - returns server metadata
});

// ============================================================================
// Type Inference from Schemas (DRY principle)
// ============================================================================

export type CreateTaskParams = z.infer<typeof CreateTaskParamsSchema>;
export type UpdateTaskParams = z.infer<typeof UpdateTaskParamsSchema>;
export type SplitTasksParams = z.infer<typeof SplitTasksParamsSchema>;
export type ListTasksParams = z.infer<typeof ListTasksParamsSchema>;
export type QueryTaskParams = z.infer<typeof QueryTaskParamsSchema>;
export type GetTaskDetailParams = z.infer<typeof GetTaskDetailParamsSchema>;
export type ExecuteTaskParams = z.infer<typeof ExecuteTaskParamsSchema>;
export type VerifyTaskParams = z.infer<typeof VerifyTaskParamsSchema>;
export type DeleteTaskParams = z.infer<typeof DeleteTaskParamsSchema>;
export type ClearAllTasksParams = z.infer<typeof ClearAllTasksParamsSchema>;
export type AnalyzeTaskParams = z.infer<typeof AnalyzeTaskParamsSchema>;
export type ReflectTaskParams = z.infer<typeof ReflectTaskParamsSchema>;
export type PlanTaskParams = z.infer<typeof PlanTaskParamsSchema>;
export type ResearchModeParams = z.infer<typeof ResearchModeParamsSchema>;
export type ProcessThoughtParams = z.infer<typeof ProcessThoughtParamsSchema>;
export type InitProjectRulesParams = z.infer<typeof InitProjectRulesParamsSchema>;
export type GetServerInfoParams = z.infer<typeof GetServerInfoParamsSchema>;

// ============================================================================
// Domain Model Type Exports (for use in application code)
// ============================================================================

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type RelatedFileType = z.infer<typeof RelatedFileTypeSchema>;
export type TaskDependency = z.infer<typeof TaskDependencySchema>;
export type RelatedFile = z.infer<typeof RelatedFileSchema>;
export type TaskItem = z.infer<typeof TaskItemSchema>;
export type TaskDocument = z.infer<typeof TaskDocumentSchema>;
export type UpdateMode = z.infer<typeof UpdateModeSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate and parse a task document from unknown data
 * Use this for all JSON file reads to ensure data integrity.
 *
 * @param data - Unknown data from file or external source
 * @returns Validated TaskDocument
 * @throws ZodError if validation fails
 */
export function validateTaskDocument(data: unknown): TaskDocument {
  return TaskDocumentSchema.parse(data);
}

/**
 * Safely validate a task document, returning success/error result
 *
 * @param data - Unknown data from file or external source
 * @returns { success: true, data: TaskDocument } or { success: false, error: ZodError }
 */
export function safeValidateTaskDocument(data: unknown) {
  return TaskDocumentSchema.safeParse(data);
}

/**
 * Validate a single task item
 *
 * @param data - Unknown data
 * @returns Validated TaskItem
 * @throws ZodError if validation fails
 */
export function validateTaskItem(data: unknown): TaskItem {
  return TaskItemSchema.parse(data);
}

/**
 * Create an empty task document
 * Matches C# TaskDocument.Empty
 */
export function createEmptyTaskDocument(): TaskDocument {
  return {
    version: '1.0',
    tasks: [],
  };
}
