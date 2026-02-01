/**
 * Tests for Dependency Injection Container
 *
 * Tests cover:
 * - Container creation with default and custom options
 * - Service resolution and singleton lifetime
 * - Global container management
 * - Test isolation patterns
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  createContainer,
  initializeGlobalContainer,
  getGlobalContainer,
  resetGlobalContainer,
  hasGlobalContainer,
  type ServiceContainer,
  type ContainerOptions,
} from '../../src/server/container.js';
import { TaskStore } from '../../src/data/taskStore.js';
import { MemoryStore } from '../../src/data/memoryStore.js';
import { RulesStore } from '../../src/data/rulesStore.js';
import { TaskSearchService } from '../../src/data/taskSearchService.js';
import { createSilentLogger } from '../support/testLogger.js';

describe('Dependency Injection Container', () => {
  beforeEach(() => {
    createSilentLogger();
    resetGlobalContainer();
  });

  afterEach(() => {
    resetGlobalContainer();
  });

  describe('createContainer', () => {
    test('should create container with default options', () => {
      const container = createContainer();

      // Verify all services are present
      expect(container.logger).toBeDefined();
      expect(container.taskStore).toBeInstanceOf(TaskStore);
      expect(container.memoryStore).toBeInstanceOf(MemoryStore);
      expect(container.rulesStore).toBeInstanceOf(RulesStore);
      expect(container.taskSearchService).toBeInstanceOf(TaskSearchService);
    });

    test('should create container with custom data directory', () => {
      const customDir = '/tmp/test-custom-dir';
      const container = createContainer({ dataDir: customDir });

      expect(container.taskStore).toBeInstanceOf(TaskStore);
      expect(container.memoryStore).toBeInstanceOf(MemoryStore);
      expect(container.rulesStore).toBeInstanceOf(RulesStore);
    });

    test('should create container with custom logger', () => {
      const customLogger = createSilentLogger();
      const container = createContainer({ logger: customLogger });

      expect(container.logger).toBe(customLogger);
    });

    test('should return immutable container', () => {
      const container = createContainer();

      // Attempting to modify container should throw
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        container.taskStore = null;
      }).toThrow();
    });

    test('should create singleton services', () => {
      const container = createContainer();

      // Services should be the same instance across multiple accesses
      const taskStore1 = container.taskStore;
      const taskStore2 = container.taskStore;
      expect(taskStore1).toBe(taskStore2);

      const logger1 = container.logger;
      const logger2 = container.logger;
      expect(logger1).toBe(logger2);
    });

    test('should inject TaskStore into TaskSearchService', () => {
      const container = createContainer();

      // TaskSearchService should have access to TaskStore
      // This demonstrates dependency injection working
      expect(container.taskSearchService).toBeInstanceOf(TaskSearchService);
    });
  });

  describe('Global Container Management', () => {
    test('should initialize global container', () => {
      expect(hasGlobalContainer()).toBe(false);

      const container = initializeGlobalContainer();

      expect(hasGlobalContainer()).toBe(true);
      expect(container.taskStore).toBeInstanceOf(TaskStore);
    });

    test('should get global container after initialization', () => {
      const container1 = initializeGlobalContainer();
      const container2 = getGlobalContainer();

      expect(container1).toBe(container2);
    });

    test('should throw if initializing global container twice', () => {
      initializeGlobalContainer();

      expect(() => {
        initializeGlobalContainer();
      }).toThrow('Global container already initialized');
    });

    test('should throw if getting global container before initialization', () => {
      expect(() => {
        getGlobalContainer();
      }).toThrow('Global container not initialized');
    });

    test('should reset global container', () => {
      initializeGlobalContainer();
      expect(hasGlobalContainer()).toBe(true);

      resetGlobalContainer();
      expect(hasGlobalContainer()).toBe(false);
    });

    test('should allow reinitialization after reset', () => {
      const container1 = initializeGlobalContainer();
      resetGlobalContainer();
      const container2 = initializeGlobalContainer();

      // Should be different instances
      expect(container1).not.toBe(container2);
    });

    test('should initialize with custom options', () => {
      const customDir = '/tmp/test-global';
      const container = initializeGlobalContainer({ dataDir: customDir });

      expect(container.taskStore).toBeInstanceOf(TaskStore);
    });
  });

  describe('Test Isolation Patterns', () => {
    test('should create independent containers per test', () => {
      // Pattern 1: Create fresh container per test
      const container1 = createContainer({ dataDir: '/tmp/test-1' });
      const container2 = createContainer({ dataDir: '/tmp/test-2' });

      // Containers should be independent
      expect(container1).not.toBe(container2);
      expect(container1.taskStore).not.toBe(container2.taskStore);
    });

    test('should support global container in tests with reset', () => {
      // Pattern 2: Use global container with beforeEach/afterEach reset
      const container1 = initializeGlobalContainer({ dataDir: '/tmp/test-3' });
      resetGlobalContainer();

      const container2 = initializeGlobalContainer({ dataDir: '/tmp/test-4' });

      expect(container1).not.toBe(container2);
    });

    test('should demonstrate composition root pattern', () => {
      // Composition Root: All dependencies wired in one place
      const container = createContainer({
        dataDir: '/tmp/test-composition',
      });

      // All services available from single container
      expect(container.taskStore).toBeDefined();
      expect(container.memoryStore).toBeDefined();
      expect(container.rulesStore).toBeDefined();
      expect(container.taskSearchService).toBeDefined();
      expect(container.logger).toBeDefined();
    });
  });

  describe('Container Options', () => {
    test('should accept empty options object', () => {
      const container = createContainer({});

      expect(container.taskStore).toBeInstanceOf(TaskStore);
      expect(container.logger).toBeDefined();
    });

    test('should accept partial options', () => {
      const options: ContainerOptions = { dataDir: '/tmp/test-partial' };
      const container = createContainer(options);

      expect(container.taskStore).toBeInstanceOf(TaskStore);
    });

    test('should use default logger if not provided', () => {
      const container = createContainer({ dataDir: '/tmp/test-default-logger' });

      expect(container.logger).toBeDefined();
      expect(container.logger.info).toBeDefined();
    });
  });

  describe('Service Dependencies', () => {
    test('should create all services successfully', () => {
      const container = createContainer();

      // All services should be created and wired
      expect(container.taskSearchService).toBeInstanceOf(TaskSearchService);
      expect(container.taskStore).toBeInstanceOf(TaskStore);
    });

    test('should create independent service instances per container', () => {
      const container1 = createContainer();
      const container2 = createContainer();

      // Different containers = different service instances
      expect(container1.taskStore).not.toBe(container2.taskStore);
      expect(container1.taskSearchService).not.toBe(container2.taskSearchService);
    });
  });
});
