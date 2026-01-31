/**
 * Tests for MemoryStore
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStore } from '../../src/data/memoryStore.js';
import { type TaskDocument } from '../../src/data/schemas.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('MemoryStore', () => {
  let tempDir: string;
  let store: MemoryStore;
  let sampleDocument: TaskDocument;

  beforeEach(async () => {
    // Create unique temp directory
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `memorystore-${timestamp}-${random}-`));
    store = new MemoryStore(tempDir);

    // Sample document with valid UUIDs
    sampleDocument = {
      version: '1.0',
      tasks: [
        {
          id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
          name: 'Test Task 1',
          description: 'Description 1',
          notes: null,
          status: 'completed',
          dependencies: [],
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
          completedAt: '2026-01-02T10:00:00Z',
          summary: 'Completed successfully',
          relatedFiles: [],
          analysisResult: null,
          agent: null,
          implementationGuide: null,
          verificationCriteria: null,
        },
        {
          id: 'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e',
          name: 'Test Task 2',
          description: 'Description 2',
          notes: null,
          status: 'pending',
          dependencies: [],
          createdAt: '2026-01-02T10:00:00Z',
          updatedAt: '2026-01-02T10:00:00Z',
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
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up ${tempDir}:`, error);
    }
  });

  describe('saveSnapshotAsync', () => {
    it('should save snapshot with sanitized name', async () => {
      const filePath = await store.saveSnapshotAsync('test-snapshot', sampleDocument);

      expect(filePath).toBeTruthy();
      expect(filePath).toContain('test-snapshot');
      expect(filePath).toMatch(/\.json$/);

      // Verify file exists
      await expect(fs.access(filePath)).resolves.toBeUndefined();
    });

    it('should sanitize filename with special characters', async () => {
      const filePath = await store.saveSnapshotAsync('test/snapshot:with*special?chars', sampleDocument);

      // Check filename only (not full path, which may have drive letter with colon on Windows)
      const filename = path.basename(filePath);
      expect(filename).not.toContain('/');
      expect(filename).not.toContain(':');
      expect(filename).not.toContain('*');
      expect(filename).not.toContain('?');
    });

    it('should replace spaces with underscores', async () => {
      const filePath = await store.saveSnapshotAsync('test snapshot name', sampleDocument);

      expect(filePath).toContain('test_snapshot_name');
      expect(filePath).not.toContain(' ');
    });

    it('should include timestamp in filename', async () => {
      const filePath = await store.saveSnapshotAsync('test', sampleDocument);

      // Filename should match pattern: test_YYYY-MM-DDTHH-MM-SS-sssZ.json
      expect(filePath).toMatch(/test_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
    });

    it('should reject empty name after sanitization', async () => {
      await expect(
        store.saveSnapshotAsync('///...', sampleDocument)
      ).rejects.toThrow('Snapshot name cannot be empty');
    });

    it('should reject name that is too long', async () => {
      const longName = 'a'.repeat(150);

      await expect(
        store.saveSnapshotAsync(longName, sampleDocument)
      ).rejects.toThrow('Snapshot name too long');
    });

    it('should reject snapshot that is too large', async () => {
      // Create document with many tasks to exceed size limit
      const largeTasks = Array.from({ length: 10000 }, (_, i) => ({
        ...sampleDocument.tasks[0],
        id: `task-${i}`,
        description: 'x'.repeat(1000), // Large description
      }));

      const largeDocument: TaskDocument = {
        version: '1.0',
        tasks: largeTasks,
      };

      await expect(
        store.saveSnapshotAsync('large', largeDocument)
      ).rejects.toThrow('Snapshot too large');
    });
  });

  describe('loadSnapshotAsync', () => {
    it('should load saved snapshot', async () => {
      const filePath = await store.saveSnapshotAsync('test', sampleDocument);
      const filename = path.basename(filePath);

      const loaded = await store.loadSnapshotAsync(filename);

      expect(loaded).toEqual(sampleDocument);
    });

    it('should load snapshot without .json extension', async () => {
      const filePath = await store.saveSnapshotAsync('test', sampleDocument);
      const filename = path.basename(filePath, '.json');

      const loaded = await store.loadSnapshotAsync(filename);

      expect(loaded).toEqual(sampleDocument);
    });

    it('should throw error for non-existent snapshot', async () => {
      await expect(
        store.loadSnapshotAsync('nonexistent')
      ).rejects.toThrow('Snapshot not found');
    });

    it('should prevent directory traversal', async () => {
      await expect(
        store.loadSnapshotAsync('../../../etc/passwd')
      ).rejects.toThrow('directory traversal detected');
    });
  });

  describe('listSnapshotsAsync', () => {
    it('should return empty array when no snapshots exist', async () => {
      const snapshots = await store.listSnapshotsAsync();

      expect(snapshots).toEqual([]);
    });

    it('should list all snapshots', async () => {
      await store.saveSnapshotAsync('snapshot1', sampleDocument);
      await store.saveSnapshotAsync('snapshot2', sampleDocument);

      const snapshots = await store.listSnapshotsAsync();

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].name).toMatch(/snapshot/);
      expect(snapshots[1].name).toMatch(/snapshot/);
    });

    it('should include task count in metadata', async () => {
      await store.saveSnapshotAsync('test', sampleDocument);

      const snapshots = await store.listSnapshotsAsync();

      expect(snapshots[0].taskCount).toBe(2);
    });

    it('should sort snapshots by timestamp (newest first)', async () => {
      await store.saveSnapshotAsync('old', sampleDocument);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await store.saveSnapshotAsync('new', sampleDocument);

      const snapshots = await store.listSnapshotsAsync();

      expect(snapshots[0].name).toContain('new');
      expect(snapshots[1].name).toContain('old');
    });

    it('should skip corrupted snapshots', async () => {
      // Save valid snapshot
      await store.saveSnapshotAsync('valid', sampleDocument);

      // Create corrupted file manually
      const memoryDir = path.join(tempDir, 'memory');
      await fs.writeFile(path.join(memoryDir, 'corrupted.json'), '{ invalid json', 'utf-8');

      const snapshots = await store.listSnapshotsAsync();

      // Should only include valid snapshot
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].name).toContain('valid');
    });
  });

  describe('deleteSnapshotAsync', () => {
    it('should delete existing snapshot', async () => {
      const filePath = await store.saveSnapshotAsync('test', sampleDocument);
      const filename = path.basename(filePath);

      const deleted = await store.deleteSnapshotAsync(filename);

      expect(deleted).toBe(true);
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should return false for non-existent snapshot', async () => {
      const deleted = await store.deleteSnapshotAsync('nonexistent');

      expect(deleted).toBe(false);
    });

    it('should prevent directory traversal', async () => {
      await expect(
        store.deleteSnapshotAsync('../../../important-file')
      ).rejects.toThrow('directory traversal detected');
    });
  });

  describe('createBackupAsync', () => {
    it('should backup only completed tasks', async () => {
      const filePath = await store.createBackupAsync(sampleDocument);

      expect(filePath).toBeTruthy();
      expect(filePath).toContain('backup_');

      // Load backup and verify
      const backupContent = await fs.readFile(filePath, 'utf-8');
      const backup = JSON.parse(backupContent);

      expect(backup.tasks).toHaveLength(1);
      expect(backup.tasks[0].status).toBe('completed');
    });

    it('should include timestamp in backup filename', async () => {
      const filePath = await store.createBackupAsync(sampleDocument);

      expect(filePath).toMatch(/backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
    });

    it('should throw error when no completed tasks exist', async () => {
      const pendingOnlyDoc: TaskDocument = {
        version: '1.0',
        tasks: [sampleDocument.tasks[1]!], // Only pending task
      };

      await expect(
        store.createBackupAsync(pendingOnlyDoc)
      ).rejects.toThrow('No completed tasks to backup');
    });

    it('should preserve task data in backup', async () => {
      const filePath = await store.createBackupAsync(sampleDocument);

      const backupContent = await fs.readFile(filePath, 'utf-8');
      const backup = JSON.parse(backupContent);

      expect(backup.tasks[0]).toEqual(sampleDocument.tasks[0]);
    });
  });

  describe('filename sanitization', () => {
    it('should remove path separators', async () => {
      const filePath = await store.saveSnapshotAsync('path/to/file', sampleDocument);

      expect(path.basename(filePath)).not.toContain('/');
      expect(path.basename(filePath)).not.toContain('\\');
    });

    it('should remove null bytes', async () => {
      const filePath = await store.saveSnapshotAsync('test\0file', sampleDocument);

      expect(path.basename(filePath)).not.toContain('\0');
    });

    it('should remove control characters', async () => {
      const filePath = await store.saveSnapshotAsync('test\x00\x1F\x7Ffile', sampleDocument);

      expect(path.basename(filePath)).toContain('testfile');
    });

    it('should remove Windows-problematic characters', async () => {
      const filePath = await store.saveSnapshotAsync('test<>:"|?*file', sampleDocument);

      expect(path.basename(filePath)).not.toMatch(/[<>:"|?*]/);
    });

    it('should collapse multiple underscores', async () => {
      const filePath = await store.saveSnapshotAsync('test   multiple   spaces', sampleDocument);

      expect(path.basename(filePath)).toContain('test_multiple_spaces');
      expect(path.basename(filePath)).not.toContain('__');
    });

    it('should trim leading and trailing dots', async () => {
      const filePath = await store.saveSnapshotAsync('...test...', sampleDocument);

      const filename = path.basename(filePath);
      // Should not start with dots
      expect(filename).not.toMatch(/^\./);
      // Should end with timestamp then .json extension
      expect(filename).toMatch(/_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
    });
  });
});
