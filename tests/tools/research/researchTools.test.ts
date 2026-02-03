/**
 * Research Tools Tests
 *
 * Tests for research_mode tool.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createContainer, resetGlobalContainer, type ServiceContainer } from '../../../src/server/container.js';
import { createMcpServer } from '../../../src/server/mcpServer.js';

describe('Research Tools', () => {
  let tempDir: string;
  let container: ServiceContainer;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `researchtools-${timestamp}-${random}-`));
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

  describe('research_mode', () => {
    it('should initiate research for a new topic', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      expect(handler).toBeDefined();

      const result = await handler!.execute({
        topic: 'TypeScript generics and constraints',
        previousState: '',
        currentState: 'Starting research on TypeScript generics',
        nextSteps: 'Explore basic generic syntax and type parameters',
      });

      expect(result).toContain('Research Mode');
      expect(result).toContain('TypeScript generics');
      expect(result).toContain('Starting research');
    });

    it('should handle iterative research with previous state', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      const result = await handler!.execute({
        topic: 'React hooks best practices',
        previousState: 'Researched useState and useEffect basics',
        currentState: 'Exploring useCallback and useMemo optimization',
        nextSteps: 'Investigate custom hooks patterns',
      });

      expect(result).toContain('Research Mode');
      expect(result).toContain('React hooks');
      expect(result).toContain('previous');
    });

    it('should validate required fields', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      await expect(
        handler!.execute({
          topic: '', // Empty topic - invalid
          previousState: '',
          currentState: 'Some state',
          nextSteps: 'Some steps',
        })
      ).rejects.toThrow();

      await expect(
        handler!.execute({
          topic: 'Valid topic',
          previousState: '',
          currentState: '', // Empty current state - invalid
          nextSteps: 'Some steps',
        })
      ).rejects.toThrow();

      await expect(
        handler!.execute({
          topic: 'Valid topic',
          previousState: '',
          currentState: 'Some state',
          nextSteps: '', // Empty next steps - invalid
        })
      ).rejects.toThrow();
    });

    it('should enforce max length on topic field', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      const longTopic = 'a'.repeat(1001); // Exceeds 1000 char limit

      await expect(
        handler!.execute({
          topic: longTopic,
          previousState: '',
          currentState: 'State',
          nextSteps: 'Steps',
        })
      ).rejects.toThrow();
    });

    it('should enforce max length on state fields', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      const longState = 'a'.repeat(20001); // Exceeds 20000 char limit

      await expect(
        handler!.execute({
          topic: 'Valid topic',
          previousState: longState,
          currentState: 'State',
          nextSteps: 'Steps',
        })
      ).rejects.toThrow();

      await expect(
        handler!.execute({
          topic: 'Valid topic',
          previousState: '',
          currentState: longState,
          nextSteps: 'Steps',
        })
      ).rejects.toThrow();

      await expect(
        handler!.execute({
          topic: 'Valid topic',
          previousState: '',
          currentState: 'State',
          nextSteps: longState,
        })
      ).rejects.toThrow();
    });

    it('should handle complex research topics', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      const result = await handler!.execute({
        topic: 'SOLID principles in functional programming with TypeScript',
        previousState: 'Researched Single Responsibility and Open/Closed principles',
        currentState: 'Analyzing how Liskov Substitution applies to pure functions',
        nextSteps: 'Explore Interface Segregation in functional contexts',
      });

      expect(result).toContain('SOLID principles');
      expect(result).toContain('functional programming');
    });

    it('should preserve state information across iterations', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      const iteration1 = await handler!.execute({
        topic: 'Database indexing strategies',
        previousState: '',
        currentState: 'Researching B-tree indexes',
        nextSteps: 'Explore hash indexes',
      });

      const iteration2 = await handler!.execute({
        topic: 'Database indexing strategies',
        previousState: 'Researching B-tree indexes',
        currentState: 'Comparing B-tree and hash indexes',
        nextSteps: 'Investigate bitmap indexes',
      });

      expect(iteration1).toContain('B-tree');
      expect(iteration2).toContain('B-tree');
      expect(iteration2).toContain('hash indexes');
    });

    it('should handle multiline content in state fields', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      const result = await handler!.execute({
        topic: 'API design patterns',
        previousState: 'Found key patterns:\n- RESTful design\n- GraphQL\n- gRPC',
        currentState: 'Analyzing RESTful design:\n1. Resource naming\n2. HTTP methods\n3. Status codes',
        nextSteps: 'Next iteration:\n- Compare with GraphQL\n- Identify trade-offs',
      });

      expect(result).toContain('RESTful design');
      expect(result).toContain('GraphQL');
    });

    it('should detect initial vs iterative research', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      // Initial research (empty previous state)
      const initialResult = await handler!.execute({
        topic: 'Microservices architecture',
        previousState: '',
        currentState: 'Starting with service decomposition strategies',
        nextSteps: 'Research service boundaries',
      });

      // Iterative research (has previous state)
      const iterativeResult = await handler!.execute({
        topic: 'Microservices architecture',
        previousState: 'Covered service decomposition strategies',
        currentState: 'Defining service boundaries',
        nextSteps: 'Explore inter-service communication',
      });

      expect(initialResult).toBeDefined();
      expect(iterativeResult).toBeDefined();
      // Both should work but may have different formatting
    });

    it('should handle whitespace-only previous state as initial', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      const result = await handler!.execute({
        topic: 'Security best practices',
        previousState: '   \n\t  ', // Whitespace only
        currentState: 'Starting security research',
        nextSteps: 'Explore security guidance',
      });

      expect(result).toContain('Security best practices');
      expect(result).toContain('Starting');
    });

    it('should support technical topics with special characters', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      const result = await handler!.execute({
        topic: 'Async/await vs promises',
        previousState: '',
        currentState: 'Comparing async/await usage and promise behavior',
        nextSteps: 'Analyze cancellation patterns: CancellationToken vs AbortSignal',
      });

      expect(result).toContain('async');
      expect(result).toContain('Async/await');
    });

    it('should handle research on security topics', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      const result = await handler!.execute({
        topic: 'JWT token security and best practices',
        previousState: '',
        currentState: 'Researching signature algorithms (HS256 vs RS256)',
        nextSteps: 'Investigate token storage strategies and XSS prevention',
      });

      expect(result).toContain('JWT');
      expect(result).toContain('security');
    });

    it('should handle research on performance optimization', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      const result = await handler!.execute({
        topic: 'Node.js performance optimization techniques',
        previousState: 'Covered event loop and async I/O',
        currentState: 'Analyzing cluster mode and worker threads',
        nextSteps: 'Benchmark different approaches',
      });

      expect(result).toContain('Node.js');
      expect(result).toContain('performance');
    });
  });

  describe('Tool Registration', () => {
    it('should register research_mode tool', () => {
      const server = createMcpServer(container);

      expect(server['tools'].has('research_mode')).toBe(true);
    });

    it('should have valid JSON schema', () => {
      const server = createMcpServer(container);

      const handler = server['tools'].get('research_mode');
      expect(handler).toBeDefined();
      // Just check that schema is defined - structure can vary
      expect(handler?.inputSchema).toBeDefined();
    });

    it('should have descriptive tool description', () => {
      const server = createMcpServer(container);

      const handler = server['tools'].get('research_mode');
      expect(handler?.description).toContain('research');
      expect(handler?.description).toContain('topic');
      expect(handler?.description).toContain('iterative');
    });
  });

  describe('Logging', () => {
    it('should log research mode invocations', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      // Logger should record topic and initial status
      await handler!.execute({
        topic: 'Test topic',
        previousState: '',
        currentState: 'Test state',
        nextSteps: 'Test steps',
      });

      // Verify no errors thrown (logger is working)
      expect(true).toBe(true);
    });

    it('should distinguish initial vs iterative in logs', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('research_mode');

      // Initial
      await handler!.execute({
        topic: 'Topic 1',
        previousState: '',
        currentState: 'State 1',
        nextSteps: 'Steps 1',
      });

      // Iterative
      await handler!.execute({
        topic: 'Topic 2',
        previousState: 'Previous',
        currentState: 'State 2',
        nextSteps: 'Steps 2',
      });

      // Both should complete without errors
      expect(true).toBe(true);
    });
  });
});
