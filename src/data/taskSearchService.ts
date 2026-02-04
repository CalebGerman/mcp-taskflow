/**
 * TaskSearchService - Search and query functionality for tasks
 *
 * Provides:
 * - Full-text search across task fields
 * - Filtering by status
 * - Pagination with offset/limit
 * - Multiple sorting options
 * - Regex safety
 */

import { type TaskItem, type TaskStatus } from './schemas.js';

/**
 * Sort field options
 */
export type SortField = 'name' | 'createdAt' | 'updatedAt' | 'status';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Search query parameters
 */
export interface SearchQuery {
  /** Text to search for in name, description, notes */
  query?: string | null;
  /** Filter by task status */
  status?: TaskStatus | null;
  /** Page number (1-based) */
  page?: number;
  /** Items per page (default: 10, max: 1000) */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: SortField;
  /** Sort direction */
  sortDirection?: SortDirection;
}

/**
 * Paginated search results
 */
export interface SearchResults {
  /** Tasks matching the query */
  tasks: TaskItem[];
  /** Total number of matching tasks (before pagination) */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

/**
 * Maximum results to prevent memory exhaustion
 */
const MAX_PAGE_SIZE = 1000;

/**
 * Default page size
 */
const DEFAULT_PAGE_SIZE = 10;

/**
 * Maximum query length to keep search bounded
 */
const MAX_PATTERN_LENGTH = 100;

/**
 * TaskSearchService - Provides search and query functionality
 *
 * Input validation and safe regex usage.
 */
export class TaskSearchService {
  /**
   * Search tasks with filtering, pagination, and sorting
   *
   * @param tasks - All tasks to search
   * @param query - Search parameters
   * @returns Paginated search results
   */
  public search(tasks: TaskItem[], query: SearchQuery = {}): SearchResults {
    // Step 1: Filter by query string (if provided)
    let filtered = query.query
      ? this.filterByQuery(tasks, query.query)
      : tasks;

    // Step 2: Filter by status (if provided)
    if (query.status) {
      filtered = this.filterByStatus(filtered, query.status);
    }

    // Step 3: Sort results
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';
    const sorted = this.sortTasks(filtered, sortBy, sortDirection);

    // Step 4: Paginate results
    const page = Math.max(1, query.page ?? 1);
    const pageSize = this.validatePageSize(query.pageSize);
    const paginated = this.paginate(sorted, page, pageSize);

    return {
      tasks: paginated,
      total: sorted.length,
      page,
      pageSize,
      totalPages: Math.ceil(sorted.length / pageSize),
      hasMore: page * pageSize < sorted.length,
    };
  }

  /**
   * Filter tasks by text query (case-insensitive search across name, description, notes)
   *
   * @param tasks - Tasks to filter
   * @param query - Search query string
   * @returns Filtered tasks
   */
  private filterByQuery(tasks: TaskItem[], query: string): TaskItem[] {
    const trimmed = query.trim();

    if (trimmed.length === 0) {
      return tasks;
    }

    // Validate query length
    if (trimmed.length > MAX_PATTERN_LENGTH) {
      throw new Error(
        `Search query too long (max ${MAX_PATTERN_LENGTH} characters)`
      );
    }

    const normalizedQuery = trimmed.toLowerCase();

    // Filter tasks that match in name, description, or notes
    return tasks.filter(task => {
      const searchableText = [
        task.name,
        task.description,
        task.notes ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }

  /**
   * Filter tasks by status
   *
   * @param tasks - Tasks to filter
   * @param status - Status to filter by
   * @returns Filtered tasks
   */
  private filterByStatus(tasks: TaskItem[], status: TaskStatus): TaskItem[] {
    return tasks.filter(task => task.status === status);
  }

  /**
   * Sort tasks by specified field and direction
   *
   * @param tasks - Tasks to sort
   * @param sortBy - Field to sort by
   * @param direction - Sort direction
   * @returns Sorted tasks (new array)
   */
  private sortTasks(
    tasks: TaskItem[],
    sortBy: SortField,
    direction: SortDirection
  ): TaskItem[] {
    // Create copy to avoid mutating input
    const sorted = [...tasks];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = a.createdAt.localeCompare(b.createdAt);
          break;
        case 'updatedAt':
          comparison = a.updatedAt.localeCompare(b.updatedAt);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Paginate tasks
   *
   * @param tasks - Sorted tasks to paginate
   * @param page - Page number (1-based)
   * @param pageSize - Items per page
   * @returns Slice of tasks for the requested page
   */
  private paginate(tasks: TaskItem[], page: number, pageSize: number): TaskItem[] {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return tasks.slice(startIndex, endIndex);
  }

  /**
   * Validate and normalize page size
   *
   * @param pageSize - Requested page size
   * @returns Validated page size (within bounds)
   */
  private validatePageSize(pageSize?: number): number {
    if (pageSize === undefined || pageSize === null) {
      return DEFAULT_PAGE_SIZE;
    }

    if (pageSize < 1) {
      return DEFAULT_PAGE_SIZE;
    }

    if (pageSize > MAX_PAGE_SIZE) {
      return MAX_PAGE_SIZE;
    }

    return Math.floor(pageSize);
  }

  // No regex usage for search; plain case-insensitive matching keeps queries fast and safe.
}
