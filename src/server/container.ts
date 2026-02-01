/**
 * Dependency Injection Container
 *
 * Manual dependency injection implementation for the MCP server.
 * All services are singletons - created once per container.
 */

import type { Logger } from 'pino';
import { getLogger } from './logger.js';
import { TaskStore } from '../data/taskStore.js';
import { MemoryStore } from '../data/memoryStore.js';
import { RulesStore } from '../data/rulesStore.js';
import { TaskSearchService } from '../data/taskSearchService.js';

/**
 * Service container holding all application services
 *
 * All services are singletons - created once and reused
 */
export interface ServiceContainer {
  readonly logger: Logger;
  readonly taskStore: TaskStore;
  readonly memoryStore: MemoryStore;
  readonly rulesStore: RulesStore;
  readonly taskSearchService: TaskSearchService;
}

/**
 * Container options for configuration
 */
export interface ContainerOptions {
  /**
   * Data directory for persistence (optional override for testing)
   */
  readonly dataDir?: string;

  /**
   * Logger instance (optional override for testing)
   */
  readonly logger?: Logger;
}

/**
 * Create and configure the service container
 *
 * This is the "Composition Root" - the single place where all
 * dependencies are wired together.
 *
 * @param options - Container configuration options
 * @returns Configured service container with all singleton services
 *
 * @example
 * ```typescript
 * // Production usage
 * const container = createContainer();
 * const server = createMcpServer(container);
 *
 * // Test usage with overrides
 * const container = createContainer({
 *   dataDir: '/tmp/test-data',
 *   logger: testLogger
 * });
 * ```
 */
export function createContainer(
  options: ContainerOptions = {}
): ServiceContainer {
  const { dataDir, logger = getLogger() } = options;

  // Create data layer services
  // All accept optional dataDir for test isolation
  const taskStore = new TaskStore(dataDir);
  const memoryStore = new MemoryStore(dataDir);
  const rulesStore = new RulesStore(dataDir);

  // Create service layer services
  // TaskSearchService is stateless - no dependencies needed
  const taskSearchService = new TaskSearchService();

  // Return immutable container
  // Services are created once and reused (singleton lifetime)
  return Object.freeze({
    logger,
    taskStore,
    memoryStore,
    rulesStore,
    taskSearchService,
  });
}

/**
 * Global container instance (optional)
 *
 * While we support a global instance for convenience,
 * prefer explicit dependency passing in production code.
 *
 * Use this only for:
 * - Simple scripts
 * - Top-level initialization
 *
 * Don't use this for:
 * - Service implementations (use constructor injection)
 * - Deep in the call stack (prefer explicit passing)
 */
let globalContainer: ServiceContainer | null = null;

/**
 * Initialize the global container
 *
 * Should be called once at application startup.
 *
 * @param options - Container configuration options
 * @returns The initialized global container
 * @throws Error if already initialized
 *
 * @example
 * ```typescript
 * // In main entry point
 * const container = initializeGlobalContainer();
 * const server = createMcpServer(container);
 * ```
 */
export function initializeGlobalContainer(
  options: ContainerOptions = {}
): ServiceContainer {
  if (globalContainer !== null) {
    throw new Error(
      'Global container already initialized. Call resetGlobalContainer() first if reinitializing.'
    );
  }

  globalContainer = createContainer(options);
  return globalContainer;
}

/**
 * Get the global container instance
 *
 * @returns The global container
 * @throws Error if not initialized
 *
 * @example
 * ```typescript
 * const container = getGlobalContainer();
 * const tasks = await container.taskStore.getAllAsync();
 * ```
 */
export function getGlobalContainer(): ServiceContainer {
  if (globalContainer === null) {
    throw new Error(
      'Global container not initialized. Call initializeGlobalContainer() first.'
    );
  }

  return globalContainer;
}

/**
 * Reset the global container (for testing)
 *
 * This allows tests to create fresh containers without
 * shared state between test runs.
 *
 * @example
 * ```typescript
 * // In test teardown
 * afterEach(() => {
 *   resetGlobalContainer();
 * });
 * ```
 */
export function resetGlobalContainer(): void {
  globalContainer = null;
}

/**
 * Check if global container is initialized
 *
 * @returns True if initialized, false otherwise
 */
export function hasGlobalContainer(): boolean {
  return globalContainer !== null;
}
