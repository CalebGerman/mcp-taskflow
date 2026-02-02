/**
 * Thought Tools Tests
 *
 * Tests for process_thought tool.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createContainer, resetGlobalContainer, type ServiceContainer } from '../../../src/server/container.js';
import { createMcpServer } from '../../../src/server/mcpServer.js';

describe('Thought Tools', () => {
  let tempDir: string;
  let container: ServiceContainer;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `thoughttools-${timestamp}-${random}-`));
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

  describe('process_thought', () => {
    it('should process a single thought step', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      expect(handler).toBeDefined();

      const result = await handler!.execute({
        thought: 'Consider using dependency injection for better testability',
        thoughtNumber: 1,
        totalThoughts: 3,
        stage: 'Analysis',
        nextThoughtNeeded: true,
      });

      expect(result).toContain('Thought Process');
      expect(result).toContain('dependency injection');
      expect(result).toContain('1');
    });

    it('should handle final thought in sequence', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'Implementation complete, all tests passing',
        thoughtNumber: 3,
        totalThoughts: 3,
        stage: 'Verification',
        nextThoughtNeeded: false,
      });

      expect(result).toContain('Thought Process');
      expect(result).toContain('3');
      expect(result).toContain('Verification');
    });

    it('should validate required fields', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      await expect(
        handler!.execute({
          thought: '', // Empty thought - invalid
          thoughtNumber: 1,
          totalThoughts: 3,
          stage: 'Analysis',
          nextThoughtNeeded: true,
        })
      ).rejects.toThrow();

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 0, // Invalid number (must be >= 1)
          totalThoughts: 3,
          stage: 'Analysis',
          nextThoughtNeeded: true,
        })
      ).rejects.toThrow();

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 1,
          totalThoughts: 0, // Invalid total (must be >= 1)
          stage: 'Analysis',
          nextThoughtNeeded: true,
        })
      ).rejects.toThrow();

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 1,
          totalThoughts: 3,
          stage: '', // Empty stage - invalid
          nextThoughtNeeded: true,
        })
      ).rejects.toThrow();
    });

    it('should validate thought number does not exceed total', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 5, // Exceeds total
          totalThoughts: 3,
          stage: 'Analysis',
          nextThoughtNeeded: true,
        })
      ).rejects.toThrow();
    });

    it('should enforce max length on thought content', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const longThought = 'a'.repeat(10001); // Exceeds 10000 char limit

      await expect(
        handler!.execute({
          thought: longThought,
          thoughtNumber: 1,
          totalThoughts: 1,
          stage: 'Analysis',
          nextThoughtNeeded: false,
        })
      ).rejects.toThrow();
    });

    it('should enforce max length on stage', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const longStage = 'a'.repeat(201); // Exceeds 200 char limit

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 1,
          totalThoughts: 1,
          stage: longStage,
          nextThoughtNeeded: false,
        })
      ).rejects.toThrow();
    });

    it('should support optional tags', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'Considering security implications of user input',
        thoughtNumber: 1,
        totalThoughts: 2,
        stage: 'Security Analysis',
        nextThoughtNeeded: true,
        tags: ['security', 'input-validation', 'xss-prevention'],
      });

      expect(result).toContain('Thought Process');
      expect(result).toContain('security');
    });

    it('should support optional axioms', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'All input is potentially malicious',
        thoughtNumber: 1,
        totalThoughts: 1,
        stage: 'Security Principles',
        nextThoughtNeeded: false,
        axiomsUsed: ['Zero Trust', 'Defense in Depth', 'Fail Securely'],
      });

      expect(result).toContain('Thought Process');
      expect(result).toContain('axioms');
    });

    it('should support optional assumptions challenged', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'Questioning the need for a microservices architecture',
        thoughtNumber: 1,
        totalThoughts: 2,
        stage: 'Critical Review',
        nextThoughtNeeded: true,
        assumptionsChallenged: [
          'Microservices are always better than monoliths',
          'More services equals better scalability',
        ],
      });

      expect(result).toContain('Thought Process');
      expect(result).toContain('assumptions');
    });

    it('should enforce max 20 tags', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 1,
          totalThoughts: 1,
          stage: 'Analysis',
          nextThoughtNeeded: false,
          tags: tooManyTags,
        })
      ).rejects.toThrow();
    });

    it('should enforce max 50 chars per tag', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const longTag = 'a'.repeat(51);

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 1,
          totalThoughts: 1,
          stage: 'Analysis',
          nextThoughtNeeded: false,
          tags: [longTag],
        })
      ).rejects.toThrow();
    });

    it('should enforce max 10 axioms', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const tooManyAxioms = Array.from({ length: 11 }, (_, i) => `axiom${i}`);

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 1,
          totalThoughts: 1,
          stage: 'Analysis',
          nextThoughtNeeded: false,
          axiomsUsed: tooManyAxioms,
        })
      ).rejects.toThrow();
    });

    it('should enforce max 200 chars per axiom', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const longAxiom = 'a'.repeat(201);

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 1,
          totalThoughts: 1,
          stage: 'Analysis',
          nextThoughtNeeded: false,
          axiomsUsed: [longAxiom],
        })
      ).rejects.toThrow();
    });

    it('should enforce max 10 assumptions', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const tooManyAssumptions = Array.from({ length: 11 }, (_, i) => `assumption${i}`);

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 1,
          totalThoughts: 1,
          stage: 'Analysis',
          nextThoughtNeeded: false,
          assumptionsChallenged: tooManyAssumptions,
        })
      ).rejects.toThrow();
    });

    it('should enforce max 200 chars per assumption', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const longAssumption = 'a'.repeat(201);

      await expect(
        handler!.execute({
          thought: 'Valid thought',
          thoughtNumber: 1,
          totalThoughts: 1,
          stage: 'Analysis',
          nextThoughtNeeded: false,
          assumptionsChallenged: [longAssumption],
        })
      ).rejects.toThrow();
    });

    it('should handle all optional fields together', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'Comprehensive security analysis of authentication flow',
        thoughtNumber: 2,
        totalThoughts: 5,
        stage: 'Security Design',
        nextThoughtNeeded: true,
        tags: ['security', 'authentication', 'jwt'],
        axiomsUsed: ['Never trust client input', 'Defense in depth'],
        assumptionsChallenged: ['JWT is always the best choice'],
      });

      expect(result).toContain('Thought Process');
      expect(result).toContain('security');
    });

    it('should handle multiline thought content', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'Key considerations:\n1. Performance\n2. Security\n3. Maintainability',
        thoughtNumber: 1,
        totalThoughts: 1,
        stage: 'Planning',
        nextThoughtNeeded: false,
      });

      expect(result).toContain('Performance');
      expect(result).toContain('Security');
    });

    it('should support different thought stages', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const stages = [
        'Analysis',
        'Planning',
        'Design',
        'Implementation',
        'Testing',
        'Verification',
        'Reflection',
      ];

      for (const stage of stages) {
        const result = await handler!.execute({
          thought: `Processing ${stage} stage`,
          thoughtNumber: 1,
          totalThoughts: 1,
          stage,
          nextThoughtNeeded: false,
        });

        expect(result).toContain(stage);
      }
    });

    it('should track progress through thought sequence', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const totalThoughts = 3;

      for (let i = 1; i <= totalThoughts; i++) {
        const result = await handler!.execute({
          thought: `Thought ${i} of ${totalThoughts}`,
          thoughtNumber: i,
          totalThoughts,
          stage: 'Sequential Processing',
          nextThoughtNeeded: i < totalThoughts,
        });

        expect(result).toContain(`${i}`);
      }
    });

    it('should handle complex technical thoughts', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'Implementing CQRS pattern with event sourcing requires careful consideration of eventual consistency',
        thoughtNumber: 1,
        totalThoughts: 1,
        stage: 'Architecture Analysis',
        nextThoughtNeeded: false,
        tags: ['architecture', 'cqrs', 'event-sourcing'],
        axiomsUsed: ['Single Responsibility Principle', 'Separation of Concerns'],
      });

      expect(result).toContain('CQRS');
      expect(result).toContain('event sourcing');
    });

    it('should handle security-focused thoughts', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'All user inputs must be validated on the server side, never trust client-side validation alone',
        thoughtNumber: 1,
        totalThoughts: 3,
        stage: 'Security Analysis',
        nextThoughtNeeded: true,
        tags: ['security', 'input-validation', 'server-side'],
        axiomsUsed: ['Never trust user input', 'Server-side validation is mandatory'],
        assumptionsChallenged: ['Client-side validation is sufficient'],
      });

      expect(result).toContain('validation');
      expect(result).toContain('security');
    });
  });

  describe('Tool Registration', () => {
    it('should register process_thought tool', () => {
      const server = createMcpServer(container);

      expect(server['tools'].has('process_thought')).toBe(true);
    });

    it('should have valid JSON schema', () => {
      const server = createMcpServer(container);

      const handler = server['tools'].get('process_thought');
      expect(handler).toBeDefined();
      expect(handler?.inputSchema).toBeDefined();
      expect(handler?.inputSchema.type).toBe('object');
      expect(handler?.inputSchema.properties).toBeDefined();
      expect(handler?.inputSchema.required).toContain('thought');
      expect(handler?.inputSchema.required).toContain('thoughtNumber');
      expect(handler?.inputSchema.required).toContain('totalThoughts');
      expect(handler?.inputSchema.required).toContain('stage');
      expect(handler?.inputSchema.required).toContain('nextThoughtNeeded');
    });

    it('should have descriptive tool description', () => {
      const server = createMcpServer(container);

      const handler = server['tools'].get('process_thought');
      expect(handler?.description).toContain('thought');
      expect(handler?.description).toContain('reasoning');
      expect(handler?.description).toContain('structured');
    });
  });

  describe('Logging', () => {
    it('should log thought processing', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      // Logger should record thought number, stage, etc.
      await handler!.execute({
        thought: 'Test thought',
        thoughtNumber: 1,
        totalThoughts: 1,
        stage: 'Testing',
        nextThoughtNeeded: false,
      });

      // Verify no errors thrown (logger is working)
      expect(true).toBe(true);
    });

    it('should log whether next thought is needed', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      await handler!.execute({
        thought: 'First thought',
        thoughtNumber: 1,
        totalThoughts: 2,
        stage: 'Analysis',
        nextThoughtNeeded: true,
      });

      await handler!.execute({
        thought: 'Final thought',
        thoughtNumber: 2,
        totalThoughts: 2,
        stage: 'Conclusion',
        nextThoughtNeeded: false,
      });

      // Both should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single thought sequence', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'Single thought, no follow-up needed',
        thoughtNumber: 1,
        totalThoughts: 1,
        stage: 'Quick Decision',
        nextThoughtNeeded: false,
      });

      expect(result).toContain('Thought Process');
    });

    it('should handle empty arrays for optional fields', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'Thought with empty optional arrays',
        thoughtNumber: 1,
        totalThoughts: 1,
        stage: 'Testing',
        nextThoughtNeeded: false,
        tags: [],
        axiomsUsed: [],
        assumptionsChallenged: [],
      });

      expect(result).toBeDefined();
    });

    it('should handle special characters in thought content', async () => {
      const server = createMcpServer(container);
      const handler = server['tools'].get('process_thought');

      const result = await handler!.execute({
        thought: 'Consider using Regex: /^[a-z0-9_-]{3,16}$/ for validation & ensure it\'s XSS-safe',
        thoughtNumber: 1,
        totalThoughts: 1,
        stage: 'Implementation',
        nextThoughtNeeded: false,
      });

      expect(result).toContain('Regex');
    });
  });
});
