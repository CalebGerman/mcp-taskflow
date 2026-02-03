/**
 * Security tests: malicious JSON payloads
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { readJsonFile, FileOperationError } from '../../src/data/fileOperations.js';
import { TaskDocumentSchema } from '../../src/data/schemas.js';
import { TaskStore } from '../../src/data/taskStore.js';

describe('Security: malicious JSON payloads', () => {
  let tempDir: string;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `security-json-${timestamp}-${random}-`));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up ${tempDir}:`, error);
    }
  });

  it('should reject invalid JSON without leaking content', async () => {
    const badPath = path.join(tempDir, 'tasks.json');
    const secret = 'SECRET_TOKEN_SHOULD_NOT_LEAK';
    await fs.writeFile(badPath, `{ invalid json ${secret}`, 'utf-8');

    await expect(readJsonFile(badPath, TaskDocumentSchema)).rejects.toThrow(FileOperationError);

    try {
      await readJsonFile(badPath, TaskDocumentSchema);
    } catch (error) {
      const err = error as Error;
      expect(err.message).toContain('Invalid JSON');
      expect(err.message).not.toContain(secret);
    }
  });

  it('should reject schema-invalid JSON payloads', async () => {
    const badPath = path.join(tempDir, 'tasks.json');
    const invalidPayload = {
      version: '1.0',
      tasks: [
        {
          id: 'not-a-uuid',
          name: 'Bad Task',
          description: 'Invalid ID format',
          status: 'pending',
          dependencies: [],
          createdAt: 'not-a-date',
          updatedAt: 'not-a-date',
          completedAt: null,
          summary: null,
          relatedFiles: [],
          analysisResult: null,
          agent: null,
          implementationGuide: null,
          verificationCriteria: null,
        },
      ],
    };

    await fs.writeFile(badPath, JSON.stringify(invalidPayload, null, 2), 'utf-8');

    await expect(readJsonFile(badPath, TaskDocumentSchema)).rejects.toThrow(FileOperationError);
  });

  it('should fail TaskStore reads on malformed task data', async () => {
    const badPath = path.join(tempDir, 'tasks.json');
    await fs.writeFile(badPath, JSON.stringify({ version: '1.0', tasks: [{}] }, null, 2), 'utf-8');

    const store = new TaskStore(tempDir);
    await expect(store.getAllAsync()).rejects.toThrow(FileOperationError);
  });
});
