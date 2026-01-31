/**
 * Tests for Zod schemas
 * 
 * These tests validate that our schemas correctly accept valid data
 * and reject invalid data. This is our first line of defense against
 * malformed or malicious input from MCP clients.
 */

import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  TaskStatusSchema,
  TaskDependencySchema,
  RelatedFileTypeSchema,
  RelatedFileSchema,
  TaskItemSchema,
  TaskDocumentSchema,
  UpdateModeSchema,
  CreateTaskParamsSchema,
  UpdateTaskParamsSchema,
  SplitTasksParamsSchema,
  ListTasksParamsSchema,
  QueryTaskParamsSchema,
  GetTaskDetailParamsSchema,
  ExecuteTaskParamsSchema,
  VerifyTaskParamsSchema,
  DeleteTaskParamsSchema,
  ClearAllTasksParamsSchema,
  AnalyzeTaskParamsSchema,
  ReflectTaskParamsSchema,
  PlanTaskParamsSchema,
  ResearchModeParamsSchema,
  ProcessThoughtParamsSchema,
  validateTaskDocument,
} from '../../src/data/schemas.js';

describe('schemas', () => {
  describe('TaskStatusSchema', () => {
    it('should accept valid status values', () => {
      expect(() => TaskStatusSchema.parse('pending')).not.toThrow();
      expect(() => TaskStatusSchema.parse('in_progress')).not.toThrow();
      expect(() => TaskStatusSchema.parse('completed')).not.toThrow();
      expect(() => TaskStatusSchema.parse('blocked')).not.toThrow();
    });

    it('should reject invalid status values', () => {
      expect(() => TaskStatusSchema.parse('invalid')).toThrow(ZodError);
      expect(() => TaskStatusSchema.parse('PENDING')).toThrow(ZodError);
      expect(() => TaskStatusSchema.parse('')).toThrow(ZodError);
      expect(() => TaskStatusSchema.parse(null)).toThrow(ZodError);
    });
  });

  describe('TaskDependencySchema', () => {
    it('should accept valid UUID', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const result = TaskDependencySchema.parse({ taskId: validUUID });
      expect(result.taskId).toBe(validUUID);
    });

    it('should reject invalid UUID formats', () => {
      expect(() => TaskDependencySchema.parse({ taskId: 'not-a-uuid' })).toThrow(ZodError);
      expect(() => TaskDependencySchema.parse({ taskId: '123' })).toThrow(ZodError);
      expect(() => TaskDependencySchema.parse({ taskId: '' })).toThrow(ZodError);
      expect(() => TaskDependencySchema.parse({ taskId: '550e8400-e29b-41d4-a716' })).toThrow(ZodError);
    });
  });

  describe('RelatedFileTypeSchema', () => {
    it('should accept valid file types', () => {
      expect(() => RelatedFileTypeSchema.parse('TO_MODIFY')).not.toThrow();
      expect(() => RelatedFileTypeSchema.parse('REFERENCE')).not.toThrow();
      expect(() => RelatedFileTypeSchema.parse('CREATE')).not.toThrow();
      expect(() => RelatedFileTypeSchema.parse('DEPENDENCY')).not.toThrow();
      expect(() => RelatedFileTypeSchema.parse('OTHER')).not.toThrow();
    });

    it('should reject invalid file types', () => {
      expect(() => RelatedFileTypeSchema.parse('to_modify')).toThrow(ZodError);
      expect(() => RelatedFileTypeSchema.parse('INVALID')).toThrow(ZodError);
      expect(() => RelatedFileTypeSchema.parse('')).toThrow(ZodError);
    });
  });

  describe('RelatedFileSchema', () => {
    it('should accept valid related file', () => {
      const validFile = {
        path: 'src/file.ts',
        type: 'TO_MODIFY' as const,
        description: 'Main implementation file',
        lineStart: 10,
        lineEnd: 50,
      };
      const result = RelatedFileSchema.parse(validFile);
      expect(result).toEqual(validFile);
    });

    it('should accept file with optional fields null', () => {
      const validFile = {
        path: 'src/file.ts',
        type: 'REFERENCE' as const,
        description: null,
        lineStart: null,
        lineEnd: null,
      };
      expect(() => RelatedFileSchema.parse(validFile)).not.toThrow();
    });

    it('should accept file without optional fields', () => {
      const validFile = {
        path: 'src/file.ts',
        type: 'CREATE' as const,
      };
      expect(() => RelatedFileSchema.parse(validFile)).not.toThrow();
    });

    it('should reject empty path', () => {
      expect(() => RelatedFileSchema.parse({
        path: '',
        type: 'TO_MODIFY',
      })).toThrow(ZodError);
    });

    it('should reject path exceeding max length', () => {
      const longPath = 'a'.repeat(1001);
      expect(() => RelatedFileSchema.parse({
        path: longPath,
        type: 'TO_MODIFY',
      })).toThrow(ZodError);
    });

    it('should reject description exceeding max length', () => {
      const longDescription = 'a'.repeat(1001);
      expect(() => RelatedFileSchema.parse({
        path: 'src/file.ts',
        type: 'TO_MODIFY',
        description: longDescription,
      })).toThrow(ZodError);
    });

    it('should reject invalid line numbers', () => {
      expect(() => RelatedFileSchema.parse({
        path: 'src/file.ts',
        type: 'TO_MODIFY',
        lineStart: 0, // Line numbers start at 1
      })).toThrow(ZodError);

      expect(() => RelatedFileSchema.parse({
        path: 'src/file.ts',
        type: 'TO_MODIFY',
        lineStart: -1,
      })).toThrow(ZodError);

      expect(() => RelatedFileSchema.parse({
        path: 'src/file.ts',
        type: 'TO_MODIFY',
        lineStart: 1.5, // Must be integer
      })).toThrow(ZodError);
    });
  });

  describe('TaskItemSchema', () => {
    it('should accept valid task', () => {
      const validTask = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Task',
        description: 'Test description',
        status: 'pending' as const,
        dependencies: [],
        createdAt: '2026-01-19T10:00:00Z',
        updatedAt: '2026-01-19T10:00:00Z',
        relatedFiles: [],
      };
      const result = TaskItemSchema.parse(validTask);
      expect(result.id).toBe(validTask.id);
      expect(result.name).toBe(validTask.name);
      expect(result.dependencies).toEqual([]);
      expect(result.relatedFiles).toEqual([]);
    });

    it('should accept task with all optional fields', () => {
      const validTask = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Task',
        description: 'Test description',
        notes: 'Some notes',
        status: 'completed' as const,
        dependencies: [{ taskId: '650e8400-e29b-41d4-a716-446655440001' }],
        createdAt: '2026-01-19T10:00:00Z',
        updatedAt: '2026-01-19T11:00:00Z',
        completedAt: '2026-01-19T11:00:00Z',
        summary: 'Task summary',
        relatedFiles: [{
          path: 'src/test.ts',
          type: 'TO_MODIFY' as const,
        }],
        analysisResult: 'Analysis complete',
        agent: 'copilot',
        implementationGuide: 'Implementation steps',
        verificationCriteria: 'Acceptance criteria',
      };
      expect(() => TaskItemSchema.parse(validTask)).not.toThrow();
    });

    it('should provide default empty arrays for dependencies and relatedFiles', () => {
      const taskWithoutArrays = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Task',
        description: 'Test description',
        status: 'pending' as const,
        createdAt: '2026-01-19T10:00:00Z',
        updatedAt: '2026-01-19T10:00:00Z',
      };
      const result = TaskItemSchema.parse(taskWithoutArrays);
      expect(result.dependencies).toEqual([]);
      expect(result.relatedFiles).toEqual([]);
    });

    it('should reject empty task name', () => {
      expect(() => TaskItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: '',
        description: 'Test',
        status: 'pending',
        createdAt: '2026-01-19T10:00:00Z',
        updatedAt: '2026-01-19T10:00:00Z',
      })).toThrow(ZodError);
    });

    it('should reject task name exceeding max length', () => {
      const longName = 'a'.repeat(501);
      expect(() => TaskItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: longName,
        description: 'Test',
        status: 'pending',
        createdAt: '2026-01-19T10:00:00Z',
        updatedAt: '2026-01-19T10:00:00Z',
      })).toThrow(ZodError);
    });

    it('should reject description exceeding max length', () => {
      const longDesc = 'a'.repeat(5001);
      expect(() => TaskItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        description: longDesc,
        status: 'pending',
        createdAt: '2026-01-19T10:00:00Z',
        updatedAt: '2026-01-19T10:00:00Z',
      })).toThrow(ZodError);
    });

    it('should reject invalid datetime format', () => {
      expect(() => TaskItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        description: 'Test',
        status: 'pending',
        createdAt: 'not-a-date',
        updatedAt: '2026-01-19T10:00:00Z',
      })).toThrow(ZodError);
    });

    it('should reject fields exceeding max lengths', () => {
      const baseTask = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        description: 'Test',
        status: 'pending' as const,
        createdAt: '2026-01-19T10:00:00Z',
        updatedAt: '2026-01-19T10:00:00Z',
      };

      expect(() => TaskItemSchema.parse({
        ...baseTask,
        notes: 'a'.repeat(5001),
      })).toThrow(ZodError);

      expect(() => TaskItemSchema.parse({
        ...baseTask,
        summary: 'a'.repeat(5001),
      })).toThrow(ZodError);

      expect(() => TaskItemSchema.parse({
        ...baseTask,
        analysisResult: 'a'.repeat(20001),
      })).toThrow(ZodError);

      expect(() => TaskItemSchema.parse({
        ...baseTask,
        agent: 'a'.repeat(201),
      })).toThrow(ZodError);

      expect(() => TaskItemSchema.parse({
        ...baseTask,
        implementationGuide: 'a'.repeat(10001),
      })).toThrow(ZodError);

      expect(() => TaskItemSchema.parse({
        ...baseTask,
        verificationCriteria: 'a'.repeat(5001),
      })).toThrow(ZodError);
    });
  });

  describe('TaskDocumentSchema', () => {
    it('should accept valid task document', () => {
      const validDoc = {
        version: '1.0',
        tasks: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Task 1',
            description: 'Description 1',
            status: 'pending' as const,
            createdAt: '2026-01-19T10:00:00Z',
            updatedAt: '2026-01-19T10:00:00Z',
          },
        ],
      };
      const result = TaskDocumentSchema.parse(validDoc);
      expect(result.version).toBe('1.0');
      expect(result.tasks).toHaveLength(1);
    });

    it('should provide default empty array for tasks', () => {
      const docWithoutTasks = {
        version: '1.0',
      };
      const result = TaskDocumentSchema.parse(docWithoutTasks);
      expect(result.tasks).toEqual([]);
    });

    it('should accept various version formats', () => {
      expect(() => TaskDocumentSchema.parse({ version: '1.0', tasks: [] })).not.toThrow();
      expect(() => TaskDocumentSchema.parse({ version: '2.5', tasks: [] })).not.toThrow();
      expect(() => TaskDocumentSchema.parse({ version: '10.99', tasks: [] })).not.toThrow();
    });

    it('should reject invalid version formats', () => {
      expect(() => TaskDocumentSchema.parse({ version: '1', tasks: [] })).toThrow(ZodError);
      expect(() => TaskDocumentSchema.parse({ version: '1.0.0', tasks: [] })).toThrow(ZodError);
      expect(() => TaskDocumentSchema.parse({ version: 'v1.0', tasks: [] })).toThrow(ZodError);
      expect(() => TaskDocumentSchema.parse({ version: '', tasks: [] })).toThrow(ZodError);
    });
  });

  describe('UpdateModeSchema', () => {
    it('should accept valid update modes', () => {
      expect(() => UpdateModeSchema.parse('append')).not.toThrow();
      expect(() => UpdateModeSchema.parse('overwrite')).not.toThrow();
      expect(() => UpdateModeSchema.parse('selective')).not.toThrow();
      expect(() => UpdateModeSchema.parse('clearAllTasks')).not.toThrow();
    });

    it('should reject invalid update modes', () => {
      expect(() => UpdateModeSchema.parse('merge')).toThrow(ZodError);
      expect(() => UpdateModeSchema.parse('APPEND')).toThrow(ZodError);
      expect(() => UpdateModeSchema.parse('')).toThrow(ZodError);
    });
  });

  describe('CreateTaskParamsSchema', () => {
    it('should accept valid create task params', () => {
      const validParams = {
        name: 'New Task',
        description: 'Task description',
      };
      expect(() => CreateTaskParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should accept params with all optional fields', () => {
      const validParams = {
        name: 'New Task',
        description: 'Task description',
        dependencies: ['task-1', 'task-2'],
        relatedFiles: [{
          path: 'src/test.ts',
          type: 'TO_MODIFY' as const,
        }],
        implementationGuide: 'Step-by-step guide',
        verificationCriteria: 'Success criteria',
        notes: 'Additional notes',
        agent: 'copilot',
      };
      expect(() => CreateTaskParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should reject empty name', () => {
      expect(() => CreateTaskParamsSchema.parse({
        name: '',
        description: 'Test',
      })).toThrow(ZodError);
    });

    it('should reject empty description', () => {
      expect(() => CreateTaskParamsSchema.parse({
        name: 'Test',
        description: '',
      })).toThrow(ZodError);
    });

    it('should reject name exceeding max length', () => {
      expect(() => CreateTaskParamsSchema.parse({
        name: 'a'.repeat(501),
        description: 'Test',
      })).toThrow(ZodError);
    });

    it('should reject description exceeding max length', () => {
      expect(() => CreateTaskParamsSchema.parse({
        name: 'Test',
        description: 'a'.repeat(5001),
      })).toThrow(ZodError);
    });
  });

  describe('UpdateTaskParamsSchema', () => {
    it('should accept valid update params', () => {
      const validParams = {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Name',
      };
      expect(() => UpdateTaskParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should accept partial updates', () => {
      const validParams = {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Updated description',
      };
      expect(() => UpdateTaskParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should reject invalid UUID', () => {
      expect(() => UpdateTaskParamsSchema.parse({
        taskId: 'not-a-uuid',
        name: 'Test',
      })).toThrow(ZodError);
    });

    it('should reject empty name if provided', () => {
      expect(() => UpdateTaskParamsSchema.parse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        name: '',
      })).toThrow(ZodError);
    });
  });

  describe('QueryTaskParamsSchema', () => {
    it('should accept valid query params', () => {
      const validParams = {
        query: 'search term',
      };
      const result = QueryTaskParamsSchema.parse(validParams);
      expect(result.query).toBe('search term');
      expect(result.isId).toBe(false); // Default
      expect(result.page).toBe(1); // Default
      expect(result.pageSize).toBe(10); // Default
    });

    it('should accept custom pagination', () => {
      const validParams = {
        query: 'search',
        page: 5,
        pageSize: 20,
      };
      const result = QueryTaskParamsSchema.parse(validParams);
      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(20);
    });

    it('should reject empty query', () => {
      expect(() => QueryTaskParamsSchema.parse({
        query: '',
      })).toThrow(ZodError);
    });

    it('should reject query exceeding max length', () => {
      expect(() => QueryTaskParamsSchema.parse({
        query: 'a'.repeat(501),
      })).toThrow(ZodError);
    });

    it('should reject page less than 1', () => {
      expect(() => QueryTaskParamsSchema.parse({
        query: 'test',
        page: 0,
      })).toThrow(ZodError);
    });

    it('should reject pageSize exceeding max (DoS protection)', () => {
      expect(() => QueryTaskParamsSchema.parse({
        query: 'test',
        pageSize: 101,
      })).toThrow(ZodError);
    });

    it('should reject pageSize less than 1', () => {
      expect(() => QueryTaskParamsSchema.parse({
        query: 'test',
        pageSize: 0,
      })).toThrow(ZodError);
    });
  });

  describe('VerifyTaskParamsSchema', () => {
    it('should accept valid verify params', () => {
      const validParams = {
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        score: 85,
        summary: 'Task completed successfully',
      };
      expect(() => VerifyTaskParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should accept edge scores (0 and 100)', () => {
      expect(() => VerifyTaskParamsSchema.parse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        score: 0,
        summary: 'Failed',
      })).not.toThrow();

      expect(() => VerifyTaskParamsSchema.parse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        score: 100,
        summary: 'Perfect',
      })).not.toThrow();
    });

    it('should reject score above 100', () => {
      expect(() => VerifyTaskParamsSchema.parse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        score: 101,
        summary: 'Test',
      })).toThrow(ZodError);
    });

    it('should reject negative score', () => {
      expect(() => VerifyTaskParamsSchema.parse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        score: -1,
        summary: 'Test',
      })).toThrow(ZodError);
    });

    it('should reject non-integer score', () => {
      expect(() => VerifyTaskParamsSchema.parse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        score: 85.5,
        summary: 'Test',
      })).toThrow(ZodError);
    });

    it('should reject empty summary', () => {
      expect(() => VerifyTaskParamsSchema.parse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        score: 85,
        summary: '',
      })).toThrow(ZodError);
    });
  });

  describe('SplitTasksParamsSchema', () => {
    it('should accept valid split params', () => {
      const validParams = {
        updateMode: 'append' as const,
        tasks: [
          {
            name: 'Task 1',
            description: 'Description 1',
          },
          {
            name: 'Task 2',
            description: 'Description 2',
          },
        ],
      };
      expect(() => SplitTasksParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should reject empty tasks array', () => {
      expect(() => SplitTasksParamsSchema.parse({
        updateMode: 'append',
        tasks: [],
      })).toThrow(ZodError);
    });

    it('should reject more than 100 tasks (DoS protection)', () => {
      const manyTasks = Array.from({ length: 101 }, (_, i) => ({
        name: `Task ${i}`,
        description: `Description ${i}`,
      }));

      expect(() => SplitTasksParamsSchema.parse({
        updateMode: 'append',
        tasks: manyTasks,
      })).toThrow(ZodError);
    });
  });

  describe('ProcessThoughtParamsSchema', () => {
    it('should accept valid thought params', () => {
      const validParams = {
        thought: 'This is my thinking process',
        thoughtNumber: 1,
        totalThoughts: 5,
        stage: 'Analysis',
      };
      expect(() => ProcessThoughtParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should accept thought with all optional fields', () => {
      const validParams = {
        thought: 'This is my thinking process',
        thoughtNumber: 2,
        totalThoughts: 5,
        stage: 'Planning',
        tags: ['critical', 'architecture'],
        axiomsUsed: ['SOLID principles', 'DRY'],
        assumptionsChallenged: ['Performance is critical'],
        nextThoughtNeeded: true,
      };
      expect(() => ProcessThoughtParamsSchema.parse(validParams)).not.toThrow();
    });

    it('should reject empty thought', () => {
      expect(() => ProcessThoughtParamsSchema.parse({
        thought: '',
        thoughtNumber: 1,
        totalThoughts: 5,
        stage: 'Analysis',
      })).toThrow(ZodError);
    });

    it('should reject thoughtNumber less than 1', () => {
      expect(() => ProcessThoughtParamsSchema.parse({
        thought: 'Test',
        thoughtNumber: 0,
        totalThoughts: 5,
        stage: 'Analysis',
      })).toThrow(ZodError);
    });
  });

  describe('validateTaskDocument helper', () => {
    it('should validate and return valid document', () => {
      const validDoc = {
        version: '1.0',
        tasks: [],
      };
      const result = validateTaskDocument(validDoc);
      expect(result).toEqual(validDoc);
    });

    it('should throw ZodError for invalid document', () => {
      const invalidDoc = {
        version: 'invalid',
        tasks: [],
      };
      expect(() => validateTaskDocument(invalidDoc)).toThrow(ZodError);
    });

    it('should throw for completely malformed data', () => {
      expect(() => validateTaskDocument(null)).toThrow(ZodError);
      expect(() => validateTaskDocument(undefined)).toThrow(ZodError);
      expect(() => validateTaskDocument('not an object')).toThrow(ZodError);
      expect(() => validateTaskDocument(123)).toThrow(ZodError);
    });
  });
});
