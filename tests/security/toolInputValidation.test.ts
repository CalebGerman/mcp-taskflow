/**
 * Security tests: tool input validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  createContainer,
  resetGlobalContainer,
  type ServiceContainer,
} from '../../src/server/container.js';
import { createMcpServer } from '../../src/server/mcpServer.js';

interface InvalidCase {
  tool: string;
  args: unknown;
}

describe('Security: tool input validation', () => {
  let tempDir: string;
  let container: ServiceContainer;
  let server: ReturnType<typeof createMcpServer>;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `security-tools-${timestamp}-${random}-`));
    container = createContainer({ dataDir: tempDir });
    server = createMcpServer(container);
  });

  afterEach(async () => {
    resetGlobalContainer();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up ${tempDir}:`, error);
    }
  });

  const invalidCases: InvalidCase[] = [
    { tool: 'plan_task', args: { description: '' } },
    { tool: 'analyze_task', args: { summary: '', initialConcept: 'x' } },
    { tool: 'reflect_task', args: { summary: 'ok', analysis: '' } },
    { tool: 'split_tasks', args: { updateMode: 'append', tasks: [] } },
    { tool: 'list_tasks', args: { status: 'invalid-status' } },
    { tool: 'get_task_detail', args: { taskId: 'not-a-uuid' } },
    { tool: 'query_task', args: { query: '' } },
    { tool: 'update_task', args: { taskId: 'not-a-uuid', name: 'x' } },
    { tool: 'delete_task', args: { taskId: 'not-a-uuid' } },
    { tool: 'clear_all_tasks', args: { confirm: 'yes' } },
    { tool: 'execute_task', args: { taskId: 'not-a-uuid' } },
    { tool: 'verify_task', args: { taskId: 'not-a-uuid', score: 101, summary: '' } },
    { tool: 'research_mode', args: { topic: '', previousState: '', currentState: '', nextSteps: '' } },
    { tool: 'process_thought', args: { thought: '', thoughtNumber: 2, totalThoughts: 1, stage: '' } },
  ];

  for (const testCase of invalidCases) {
    it(`should reject invalid args for ${testCase.tool}`, async () => {
      const handler = server['tools'].get(testCase.tool);
      expect(handler).toBeDefined();

      await expect(handler!.execute(testCase.args as Record<string, unknown>)).rejects.toThrow();
    });
  }

  const tolerantCases: InvalidCase[] = [
    { tool: 'init_project_rules', args: { unexpected: 'value' } },
    { tool: 'get_server_info', args: { unexpected: 123 } },
  ];

  for (const testCase of tolerantCases) {
    it(`should tolerate extra args for ${testCase.tool}`, async () => {
      const handler = server['tools'].get(testCase.tool);
      expect(handler).toBeDefined();

      await expect(handler!.execute(testCase.args as Record<string, unknown>)).resolves.toBeTypeOf('string');
    });
  }
});
