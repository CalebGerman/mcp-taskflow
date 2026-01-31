/**
 * Tests for atomic JSON file operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  readJsonFile,
  writeJsonFile,
  fileExists,
  readJsonFileOrDefault,
  listFiles,
  deleteFile,
  FileOperationError
} from '../../src/data/fileOperations.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('fileOperations', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-ops-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('FileOperationError', () => {
    it('should create error with correct properties', () => {
      const originalError = new Error('Original error');
      const error = new FileOperationError(
        'Test error',
        '/path/to/file.json',
        'read',
        originalError
      );

      expect(error.message).toBe('Test error');
      expect(error.filePath).toBe('/path/to/file.json');
      expect(error.operation).toBe('read');
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe('FileOperationError');
    });
  });

  describe('readJsonFile', () => {
    const TestSchema = z.object({
      name: z.string(),
      count: z.number(),
    });

    it('should read and validate valid JSON file', async () => {
      const filePath = path.join(tempDir, 'test.json');
      const data = { name: 'test', count: 42 };
      await fs.writeFile(filePath, JSON.stringify(data));

      const result = await readJsonFile(filePath, TestSchema);

      expect(result).toEqual(data);
    });

    it('should throw FileOperationError for non-existent file', async () => {
      const filePath = path.join(tempDir, 'non-existent.json');

      await expect(readJsonFile(filePath, TestSchema)).rejects.toThrow(
        FileOperationError
      );
    });

    it('should throw FileOperationError for invalid JSON', async () => {
      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, '{ invalid json }');

      await expect(readJsonFile(filePath, TestSchema)).rejects.toThrow(
        FileOperationError
      );
      await expect(readJsonFile(filePath, TestSchema)).rejects.toThrow(
        /Invalid JSON/
      );
    });

    it('should throw FileOperationError for schema validation failure', async () => {
      const filePath = path.join(tempDir, 'invalid-schema.json');
      const data = { name: 'test', count: 'not-a-number' };
      await fs.writeFile(filePath, JSON.stringify(data));

      await expect(readJsonFile(filePath, TestSchema)).rejects.toThrow(
        FileOperationError
      );
      await expect(readJsonFile(filePath, TestSchema)).rejects.toThrow(
        /Schema validation failed/
      );
    });

    it('should handle complex nested schemas', async () => {
      const ComplexSchema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      });

      const filePath = path.join(tempDir, 'complex.json');
      const data = {
        user: { name: 'Alice', age: 30 },
        tags: ['admin', 'user'],
      };
      await fs.writeFile(filePath, JSON.stringify(data));

      const result = await readJsonFile(filePath, ComplexSchema);

      expect(result).toEqual(data);
    });
  });

  describe('writeJsonFile', () => {
    const TestSchema = z.object({
      name: z.string(),
      count: z.number(),
    });

    it('should write valid data to file', async () => {
      const filePath = path.join(tempDir, 'write-test.json');
      const data = { name: 'test', count: 42 };

      await writeJsonFile(filePath, data, TestSchema);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should create parent directories if they do not exist', async () => {
      const filePath = path.join(tempDir, 'nested', 'folder', 'test.json');
      const data = { name: 'test', count: 42 };

      await writeJsonFile(filePath, data, TestSchema);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual(data);
    });

    it('should throw FileOperationError for invalid data', async () => {
      const filePath = path.join(tempDir, 'invalid-write.json');
      const invalidData = { name: 'test', count: 'not-a-number' } as any;

      await expect(
        writeJsonFile(filePath, invalidData, TestSchema)
      ).rejects.toThrow(FileOperationError);
      await expect(
        writeJsonFile(filePath, invalidData, TestSchema)
      ).rejects.toThrow(/Schema validation failed/);
    });

    it('should format JSON with pretty-printing', async () => {
      const filePath = path.join(tempDir, 'pretty.json');
      const data = { name: 'test', count: 42 };

      await writeJsonFile(filePath, data, TestSchema);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('\n'); // Should have newlines (pretty-printed)
      expect(content).toMatch(/\n  "name"/); // Should be indented with 2 spaces
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(tempDir, 'overwrite.json');
      const data1 = { name: 'first', count: 1 };
      const data2 = { name: 'second', count: 2 };

      await writeJsonFile(filePath, data1, TestSchema);
      await writeJsonFile(filePath, data2, TestSchema);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual(data2);
    });

    it('should ensure atomic write (no partial files on failure)', async () => {
      const filePath = path.join(tempDir, 'atomic.json');
      const validData = { name: 'valid', count: 1 };
      
      // Write valid data first
      await writeJsonFile(filePath, validData, TestSchema);

      // Try to write invalid data
      const invalidData = { name: 'invalid', count: 'not-a-number' } as any;
      await expect(
        writeJsonFile(filePath, invalidData, TestSchema)
      ).rejects.toThrow();

      // Original file should still exist with valid data
      const content = await fs.readFile(filePath, 'utf-8');
      expect(JSON.parse(content)).toEqual(validData);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'exists.txt');
      await fs.writeFile(filePath, 'content');

      const result = await fileExists(filePath);

      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = path.join(tempDir, 'does-not-exist.txt');

      const result = await fileExists(filePath);

      expect(result).toBe(false);
    });

    it('should return true for existing directory', async () => {
      const dirPath = path.join(tempDir, 'test-dir');
      await fs.mkdir(dirPath);

      const result = await fileExists(dirPath);

      expect(result).toBe(true);
    });
  });

  describe('readJsonFileOrDefault', () => {
    const TestSchema = z.object({
      name: z.string(),
      count: z.number(),
    });

    it('should read file if it exists', async () => {
      const filePath = path.join(tempDir, 'or-default.json');
      const data = { name: 'test', count: 42 };
      await fs.writeFile(filePath, JSON.stringify(data));

      const result = await readJsonFileOrDefault(
        filePath,
        TestSchema,
        { name: 'default', count: 0 }
      );

      expect(result).toEqual(data);
    });

    it('should return default if file does not exist', async () => {
      const filePath = path.join(tempDir, 'non-existent.json');
      const defaultValue = { name: 'default', count: 0 };

      const result = await readJsonFileOrDefault(
        filePath,
        TestSchema,
        defaultValue
      );

      expect(result).toEqual(defaultValue);
    });

    it('should throw for validation errors (not return default)', async () => {
      const filePath = path.join(tempDir, 'invalid-schema.json');
      const data = { name: 'test', count: 'not-a-number' };
      await fs.writeFile(filePath, JSON.stringify(data));

      await expect(
        readJsonFileOrDefault(filePath, TestSchema, { name: 'default', count: 0 })
      ).rejects.toThrow(FileOperationError);
    });

    it('should throw for invalid JSON (not return default)', async () => {
      const filePath = path.join(tempDir, 'invalid-json.json');
      await fs.writeFile(filePath, '{ invalid }');

      await expect(
        readJsonFileOrDefault(filePath, TestSchema, { name: 'default', count: 0 })
      ).rejects.toThrow(FileOperationError);
    });
  });

  describe('listFiles', () => {
    it('should list all files in directory', async () => {
      await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content2');
      await fs.writeFile(path.join(tempDir, 'file3.json'), '{}');

      const files = await listFiles(tempDir);

      expect(files).toHaveLength(3);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).toContain('file3.json');
    });

    it('should not list directories', async () => {
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'content');
      await fs.mkdir(path.join(tempDir, 'subdir'));

      const files = await listFiles(tempDir);

      expect(files).toHaveLength(1);
      expect(files).toContain('file.txt');
      expect(files).not.toContain('subdir');
    });

    it('should return empty array for empty directory', async () => {
      const files = await listFiles(tempDir);

      expect(files).toEqual([]);
    });

    it('should throw FileOperationError for non-existent directory', async () => {
      const dirPath = path.join(tempDir, 'non-existent');

      await expect(listFiles(dirPath)).rejects.toThrow(FileOperationError);
      await expect(listFiles(dirPath)).rejects.toThrow(/Failed to list files/);
    });

    it('should return filenames only (not full paths)', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'content');

      const files = await listFiles(tempDir);

      expect(files).toEqual(['test.txt']);
      expect(files[0]).not.toContain(path.sep);
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      const filePath = path.join(tempDir, 'to-delete.txt');
      await fs.writeFile(filePath, 'content');

      await deleteFile(filePath);

      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should not throw if file does not exist', async () => {
      const filePath = path.join(tempDir, 'non-existent.txt');

      await expect(deleteFile(filePath)).resolves.not.toThrow();
    });

    it('should handle multiple delete calls gracefully', async () => {
      const filePath = path.join(tempDir, 'delete-twice.txt');
      await fs.writeFile(filePath, 'content');

      await deleteFile(filePath);
      await expect(deleteFile(filePath)).resolves.not.toThrow();
    });
  });

  describe('integration - atomic operations', () => {
    const TestSchema = z.object({
      tasks: z.array(z.object({
        id: z.string(),
        name: z.string(),
      })),
    });

    it('should handle concurrent reads safely', async () => {
      const filePath = path.join(tempDir, 'concurrent.json');
      const data = {
        tasks: [
          { id: '1', name: 'Task 1' },
          { id: '2', name: 'Task 2' },
        ],
      };
      await writeJsonFile(filePath, data, TestSchema);

      // Perform multiple concurrent reads
      const reads = await Promise.all([
        readJsonFile(filePath, TestSchema),
        readJsonFile(filePath, TestSchema),
        readJsonFile(filePath, TestSchema),
      ]);

      // All reads should return the same valid data
      reads.forEach(result => {
        expect(result).toEqual(data);
      });
    });

    it('should clean up temp files after successful write', async () => {
      const filePath = path.join(tempDir, 'cleanup.json');
      const data = { tasks: [] };

      await writeJsonFile(filePath, data, TestSchema);

      // Check that no .tmp files exist
      const files = await fs.readdir(tempDir);
      const tempFiles = files.filter(f => f.includes('.tmp.'));
      expect(tempFiles).toHaveLength(0);
    });
  });
});
