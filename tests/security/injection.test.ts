/**
 * Security tests: injection resistance
 */

import { describe, it, expect } from 'vitest';
import { TaskSearchService } from '../../src/data/taskSearchService.js';
import { TaskStore } from '../../src/data/taskStore.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Security: injection resistance', () => {
  it('should treat regex metacharacters as literals in search', () => {
    const service = new TaskSearchService();
    const tasks = [
      {
        id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        name: 'Normal Task',
        description: 'Just text',
        notes: null,
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
    ];

    const result = service.search(tasks, { query: '.*' });
    expect(result.total).toBe(0);
  });

  it('should ignore dependency strings that do not match tasks', async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `security-inject-${timestamp}-${random}-`));

    try {
      const store = new TaskStore(tempDir);
      const base = await store.createAsync({
        name: 'Base Task',
        description: 'Base',
      });

      const created = await store.createAsync({
        name: 'Injected Deps',
        description: 'Should ignore malicious dep',
        dependencies: ['Base Task; rm -rf /', 'Base Task && exit 1'],
      });

      expect(base).toBeDefined();
      expect(created.dependencies).toHaveLength(0);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
