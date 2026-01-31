/**
 * Tests for TaskSearchService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskSearchService, type SearchQuery } from '../../src/data/taskSearchService.js';
import { type TaskItem } from '../../src/data/schemas.js';

describe('TaskSearchService', () => {
  let service: TaskSearchService;
  let sampleTasks: TaskItem[];

  beforeEach(() => {
    service = new TaskSearchService();

    // Create sample tasks for testing
    sampleTasks = [
      {
        id: '1',
        name: 'Implement authentication',
        description: 'Add JWT-based auth to the API',
        notes: 'Use bcrypt for password hashing',
        status: 'pending',
        dependencies: [],
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-01-01T10:00:00Z',
        completedAt: null,
        summary: null,
        relatedFiles: [],
        analysisResult: null,
        agent: null,
        implementationGuide: null,
        verificationCriteria: null,
      },
      {
        id: '2',
        name: 'Fix login bug',
        description: 'Users cannot log in with special characters',
        notes: null,
        status: 'in_progress',
        dependencies: [],
        createdAt: '2026-01-02T10:00:00Z',
        updatedAt: '2026-01-03T10:00:00Z',
        completedAt: null,
        summary: null,
        relatedFiles: [],
        analysisResult: null,
        agent: null,
        implementationGuide: null,
        verificationCriteria: null,
      },
      {
        id: '3',
        name: 'Write API documentation',
        description: 'Document all REST endpoints',
        notes: 'Include OpenAPI spec',
        status: 'completed',
        dependencies: [],
        createdAt: '2026-01-03T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
        completedAt: '2026-01-05T10:00:00Z',
        summary: 'Documented all endpoints',
        relatedFiles: [],
        analysisResult: null,
        agent: null,
        implementationGuide: null,
        verificationCriteria: null,
      },
      {
        id: '4',
        name: 'Optimize database queries',
        description: 'Add indexes to improve performance',
        notes: null,
        status: 'pending',
        dependencies: [],
        createdAt: '2026-01-04T10:00:00Z',
        updatedAt: '2026-01-04T10:00:00Z',
        completedAt: null,
        summary: null,
        relatedFiles: [],
        analysisResult: null,
        agent: null,
        implementationGuide: null,
        verificationCriteria: null,
      },
    ];
  });

  describe('search - basic functionality', () => {
    it('should return all tasks when no query provided', () => {
      const results = service.search(sampleTasks);

      expect(results.tasks).toHaveLength(4);
      expect(results.total).toBe(4);
      expect(results.page).toBe(1);
      expect(results.pageSize).toBe(10);
      expect(results.totalPages).toBe(1);
      expect(results.hasMore).toBe(false);
    });

    it('should return empty results for empty task list', () => {
      const results = service.search([]);

      expect(results.tasks).toEqual([]);
      expect(results.total).toBe(0);
      expect(results.totalPages).toBe(0);
    });
  });

  describe('search - text query', () => {
    it('should search in task name (case-insensitive)', () => {
      const results = service.search(sampleTasks, { query: 'API' });

      expect(results.total).toBe(2);
      expect(results.tasks.map(t => t.name)).toEqual([
        'Write API documentation',
        'Implement authentication',
      ]);
    });

    it('should search in task description', () => {
      const results = service.search(sampleTasks, { query: 'REST' });

      expect(results.total).toBe(1);
      expect(results.tasks[0].name).toBe('Write API documentation');
    });

    it('should search in task notes', () => {
      const results = service.search(sampleTasks, { query: 'bcrypt' });

      expect(results.total).toBe(1);
      expect(results.tasks[0].name).toBe('Implement authentication');
    });

    it('should handle case-insensitive search', () => {
      const results = service.search(sampleTasks, { query: 'AUTHENTICATION' });

      expect(results.total).toBe(1);
      expect(results.tasks[0].name).toBe('Implement authentication');
    });

    it('should trim whitespace from query', () => {
      const results = service.search(sampleTasks, { query: '  login  ' });

      expect(results.total).toBe(1);
      expect(results.tasks[0].name).toBe('Fix login bug');
    });

    it('should return all tasks for empty query string', () => {
      const results = service.search(sampleTasks, { query: '' });

      expect(results.total).toBe(4);
    });

    it('should return no results for non-matching query', () => {
      const results = service.search(sampleTasks, { query: 'nonexistent' });

      expect(results.total).toBe(0);
      expect(results.tasks).toEqual([]);
    });

    it('should escape special regex characters', () => {
      // Test that regex special chars are treated literally
      const results = service.search(sampleTasks, { query: 'API.' });

      expect(results.total).toBe(0); // No task contains "API." literally
    });

    it('should reject query that is too long', () => {
      const longQuery = 'a'.repeat(101); // Max is 100

      expect(() => {
        service.search(sampleTasks, { query: longQuery });
      }).toThrow('Search query too long');
    });
  });

  describe('search - status filtering', () => {
    it('should filter by pending status', () => {
      const results = service.search(sampleTasks, { status: 'pending' });

      expect(results.total).toBe(2);
      expect(results.tasks.every(t => t.status === 'pending')).toBe(true);
    });

    it('should filter by in_progress status', () => {
      const results = service.search(sampleTasks, { status: 'in_progress' });

      expect(results.total).toBe(1);
      expect(results.tasks[0].name).toBe('Fix login bug');
    });

    it('should filter by completed status', () => {
      const results = service.search(sampleTasks, { status: 'completed' });

      expect(results.total).toBe(1);
      expect(results.tasks[0].name).toBe('Write API documentation');
    });

    it('should combine query and status filter', () => {
      const results = service.search(sampleTasks, {
        query: 'API',
        status: 'completed',
      });

      expect(results.total).toBe(1);
      expect(results.tasks[0].name).toBe('Write API documentation');
    });

    it('should return empty when query and status do not match', () => {
      const results = service.search(sampleTasks, {
        query: 'database',
        status: 'completed',
      });

      expect(results.total).toBe(0);
    });
  });

  describe('search - pagination', () => {
    it('should use default page size of 10', () => {
      const results = service.search(sampleTasks);

      expect(results.pageSize).toBe(10);
    });

    it('should respect custom page size', () => {
      const results = service.search(sampleTasks, { pageSize: 2 });

      expect(results.pageSize).toBe(2);
      expect(results.tasks).toHaveLength(2);
      expect(results.totalPages).toBe(2);
    });

    it('should handle first page', () => {
      const results = service.search(sampleTasks, { page: 1, pageSize: 2 });

      expect(results.page).toBe(1);
      expect(results.tasks).toHaveLength(2);
      expect(results.hasMore).toBe(true);
    });

    it('should handle second page', () => {
      const results = service.search(sampleTasks, { page: 2, pageSize: 2 });

      expect(results.page).toBe(2);
      expect(results.tasks).toHaveLength(2);
      expect(results.hasMore).toBe(false);
    });

    it('should handle last page with fewer items', () => {
      const results = service.search(sampleTasks, { page: 2, pageSize: 3 });

      expect(results.page).toBe(2);
      expect(results.tasks).toHaveLength(1);
      expect(results.hasMore).toBe(false);
    });

    it('should return empty page beyond total pages', () => {
      const results = service.search(sampleTasks, { page: 10, pageSize: 2 });

      expect(results.tasks).toEqual([]);
      expect(results.hasMore).toBe(false);
    });

    it('should enforce maximum page size of 1000', () => {
      const results = service.search(sampleTasks, { pageSize: 2000 });

      expect(results.pageSize).toBe(1000);
    });

    it('should use default page size for invalid values', () => {
      const results1 = service.search(sampleTasks, { pageSize: 0 });
      expect(results1.pageSize).toBe(10);

      const results2 = service.search(sampleTasks, { pageSize: -5 });
      expect(results2.pageSize).toBe(10);
    });

    it('should normalize page to 1 for invalid values', () => {
      const results = service.search(sampleTasks, { page: 0 });

      expect(results.page).toBe(1);
    });

    it('should floor fractional page sizes', () => {
      const results = service.search(sampleTasks, { pageSize: 2.7 });

      expect(results.pageSize).toBe(2);
    });
  });

  describe('search - sorting', () => {
    it('should sort by createdAt descending by default', () => {
      const results = service.search(sampleTasks);

      expect(results.tasks.map(t => t.name)).toEqual([
        'Optimize database queries',
        'Write API documentation',
        'Fix login bug',
        'Implement authentication',
      ]);
    });

    it('should sort by createdAt ascending', () => {
      const results = service.search(sampleTasks, {
        sortBy: 'createdAt',
        sortDirection: 'asc',
      });

      expect(results.tasks.map(t => t.name)).toEqual([
        'Implement authentication',
        'Fix login bug',
        'Write API documentation',
        'Optimize database queries',
      ]);
    });

    it('should sort by updatedAt descending', () => {
      const results = service.search(sampleTasks, {
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      });

      expect(results.tasks.map(t => t.name)).toEqual([
        'Write API documentation',
        'Optimize database queries',
        'Fix login bug',
        'Implement authentication',
      ]);
    });

    it('should sort by name ascending', () => {
      const results = service.search(sampleTasks, {
        sortBy: 'name',
        sortDirection: 'asc',
      });

      expect(results.tasks.map(t => t.name)).toEqual([
        'Fix login bug',
        'Implement authentication',
        'Optimize database queries',
        'Write API documentation',
      ]);
    });

    it('should sort by name descending', () => {
      const results = service.search(sampleTasks, {
        sortBy: 'name',
        sortDirection: 'desc',
      });

      expect(results.tasks.map(t => t.name)).toEqual([
        'Write API documentation',
        'Optimize database queries',
        'Implement authentication',
        'Fix login bug',
      ]);
    });

    it('should sort by status', () => {
      const results = service.search(sampleTasks, {
        sortBy: 'status',
        sortDirection: 'asc',
      });

      const statuses = results.tasks.map(t => t.status);
      expect(statuses).toEqual(['completed', 'in_progress', 'pending', 'pending']);
    });
  });

  describe('search - combined filters', () => {
    it('should apply query, status, sort, and pagination together', () => {
      // Add more pending tasks for better testing
      const moreTasks: TaskItem[] = [
        ...sampleTasks,
        {
          id: '5',
          name: 'API rate limiting',
          description: 'Implement rate limiting for API',
          notes: null,
          status: 'pending',
          dependencies: [],
          createdAt: '2026-01-05T10:00:00Z',
          updatedAt: '2026-01-05T10:00:00Z',
          completedAt: null,
          summary: null,
          relatedFiles: [],
          analysisResult: null,
          agent: null,
          implementationGuide: null,
          verificationCriteria: null,
        },
      ];

      const results = service.search(moreTasks, {
        query: 'API',
        status: 'pending',
        sortBy: 'name',
        sortDirection: 'asc',
        page: 1,
        pageSize: 1,
      });

      expect(results.total).toBe(2); // "Implement authentication" and "API rate limiting"
      expect(results.tasks).toHaveLength(1);
      expect(results.tasks[0].name).toBe('API rate limiting');
      expect(results.hasMore).toBe(true);
    });
  });

  describe('search - large dataset performance', () => {
    it('should handle 1000+ tasks efficiently', () => {
      // Create 1000 tasks
      const largeTasks: TaskItem[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        name: `Task ${i}`,
        description: `Description for task ${i}`,
        notes: i % 2 === 0 ? `Note ${i}` : null,
        status: (i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'pending') as 'pending' | 'in_progress' | 'completed',
        dependencies: [],
        createdAt: new Date(2026, 0, 1 + i).toISOString(),
        updatedAt: new Date(2026, 0, 1 + i).toISOString(),
        completedAt: i % 3 === 0 ? new Date(2026, 0, 2 + i).toISOString() : null,
        summary: null,
        relatedFiles: [],
        analysisResult: null,
        agent: null,
        implementationGuide: null,
        verificationCriteria: null,
      }));

      const startTime = Date.now();
      const results = service.search(largeTasks, {
        query: 'task',
        status: 'pending',
        page: 1,
        pageSize: 50,
      });
      const elapsed = Date.now() - startTime;

      expect(results.total).toBeGreaterThan(0);
      expect(results.tasks).toHaveLength(50);
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should cap page size at 1000 for large requests', () => {
      const largeTasks: TaskItem[] = Array.from({ length: 2000 }, (_, i) => ({
        id: `task-${i}`,
        name: `Task ${i}`,
        description: `Description ${i}`,
        notes: null,
        status: 'pending',
        dependencies: [],
        createdAt: new Date(2026, 0, 1).toISOString(),
        updatedAt: new Date(2026, 0, 1).toISOString(),
        completedAt: null,
        summary: null,
        relatedFiles: [],
        analysisResult: null,
        agent: null,
        implementationGuide: null,
        verificationCriteria: null,
      }));

      const results = service.search(largeTasks, { pageSize: 5000 });

      expect(results.pageSize).toBe(1000);
      expect(results.tasks).toHaveLength(1000);
    });
  });

  describe('search - edge cases', () => {
    it('should handle tasks with null notes', () => {
      const results = service.search(sampleTasks, { query: 'null' });

      // Should not crash when searching tasks with null notes
      expect(results).toBeDefined();
    });

    it('should handle special characters in search query', () => {
      const specialTasks: TaskItem[] = [
        {
          ...sampleTasks[0],
          id: 'special-1',
          name: 'Fix (bug) in [parser]',
          description: 'Handle special chars: * + ? $ ^',
        },
      ];

      const results = service.search(specialTasks, { query: '(bug)' });

      expect(results.total).toBe(1);
    });

    it('should not mutate original task array', () => {
      const original = [...sampleTasks];
      
      service.search(sampleTasks, { sortBy: 'name', sortDirection: 'asc' });

      expect(sampleTasks).toEqual(original);
    });
  });
});
