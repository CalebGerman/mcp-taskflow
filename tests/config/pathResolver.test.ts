/**
 * Tests for path resolution and sanitization utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  resolveWorkspaceRoot, 
  resolveDataDir, 
  sanitizePath, 
  getDataPath,
  ensureDirectory,
  isValidPath
} from '../../src/config/pathResolver.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('pathResolver', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let tempDir: string;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Create temp directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'path-resolver-test-'));
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('resolveWorkspaceRoot', () => {
    it('should use MCP_WORKSPACE_ROOT environment variable when set', () => {
      process.env['MCP_WORKSPACE_ROOT'] = '/custom/workspace';
      
      const result = resolveWorkspaceRoot();
      
      expect(result).toBe(path.resolve('/custom/workspace'));
    });

    it('should use current working directory when MCP_WORKSPACE_ROOT not set', () => {
      delete process.env['MCP_WORKSPACE_ROOT'];
      
      const result = resolveWorkspaceRoot();
      const cwd = process.cwd();
      
      expect(result).toBe(cwd);
    });

    it('should not use protected directories', () => {
      delete process.env['MCP_WORKSPACE_ROOT'];
      
      // Mock cwd to return a protected directory
      const originalCwd = process.cwd;
      process.cwd = () => '/etc/config';
      
      const result = resolveWorkspaceRoot();
      
      // Should fall back to home directory, not use /etc
      expect(result).not.toBe('/etc/config');
      
      process.cwd = originalCwd;
    });

    it('should resolve relative paths to absolute', () => {
      process.env['MCP_WORKSPACE_ROOT'] = './relative/path';
      
      const result = resolveWorkspaceRoot();
      
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  describe('resolveDataDir', () => {
    it('should use DATA_DIR environment variable when set', () => {
      process.env['DATA_DIR'] = '/custom/data';
      
      const result = resolveDataDir();
      
      expect(result).toBe('/custom/data');
    });

    it('should default to .mcp-tasks in workspace root', () => {
      delete process.env['DATA_DIR'];
      process.env['MCP_WORKSPACE_ROOT'] = tempDir;
      
      const result = resolveDataDir();
      
      expect(result).toBe(path.join(tempDir, '.mcp-tasks'));
    });

    it('should resolve relative DATA_DIR relative to workspace root', () => {
      process.env['DATA_DIR'] = 'custom-dir';
      process.env['MCP_WORKSPACE_ROOT'] = tempDir;
      
      const result = resolveDataDir();
      
      expect(result).toBe(path.join(tempDir, 'custom-dir'));
    });

    it('should use absolute DATA_DIR as-is', () => {
      const absolutePath = path.join(tempDir, 'absolute-data');
      process.env['DATA_DIR'] = absolutePath;
      
      const result = resolveDataDir();
      
      expect(result).toBe(absolutePath);
    });
  });

  describe('sanitizePath', () => {
    it('should allow safe paths within base directory', () => {
      const basePath = tempDir;
      const userPath = 'tasks.json';
      
      const result = sanitizePath(userPath, basePath);
      
      expect(result).toBe(path.join(basePath, userPath));
    });

    it('should allow nested safe paths', () => {
      const basePath = tempDir;
      const userPath = 'nested/folder/tasks.json';
      
      const result = sanitizePath(userPath, basePath);
      
      expect(result).toBe(path.join(basePath, userPath));
    });

    it('should prevent directory traversal with ../', () => {
      const basePath = tempDir;
      const userPath = '../../etc/passwd';
      
      expect(() => sanitizePath(userPath, basePath)).toThrow(/Access denied/);
    });

    it('should prevent directory traversal with absolute paths', () => {
      const basePath = tempDir;
      const userPath = '/etc/passwd';
      
      expect(() => sanitizePath(userPath, basePath)).toThrow(/Access denied/);
    });

    it('should allow base directory itself', () => {
      const basePath = tempDir;
      const userPath = '.';
      
      const result = sanitizePath(userPath, basePath);
      
      expect(result).toBe(basePath);
    });

    it('should normalize paths before checking', () => {
      const basePath = tempDir;
      const userPath = './folder/../tasks.json';
      
      const result = sanitizePath(userPath, basePath);
      
      expect(result).toBe(path.join(basePath, 'tasks.json'));
    });

    it('should prevent null byte injection', () => {
      const basePath = tempDir;
      const userPath = 'tasks.json\0.txt';
      
      // Path resolution should handle null bytes
      const result = sanitizePath(userPath, basePath);
      
      expect(result).toBe(path.join(basePath, userPath));
    });
  });

  describe('getDataPath', () => {
    it('should return sanitized path within data directory', () => {
      process.env['DATA_DIR'] = tempDir;
      
      const result = getDataPath('tasks.json');
      
      expect(result).toBe(path.join(tempDir, 'tasks.json'));
    });

    it('should prevent directory traversal', () => {
      process.env['DATA_DIR'] = tempDir;
      
      expect(() => getDataPath('../../../etc/passwd')).toThrow(/Access denied/);
    });

    it('should allow nested paths within data directory', () => {
      process.env['DATA_DIR'] = tempDir;
      
      const result = getDataPath('memory/snapshot-001.json');
      
      expect(result).toBe(path.join(tempDir, 'memory', 'snapshot-001.json'));
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', async () => {
      const dirPath = path.join(tempDir, 'new-directory');
      
      await ensureDirectory(dirPath);
      
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      const dirPath = path.join(tempDir, 'existing-directory');
      await fs.mkdir(dirPath);
      
      await expect(ensureDirectory(dirPath)).resolves.not.toThrow();
      
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create nested directories recursively', async () => {
      const dirPath = path.join(tempDir, 'level1', 'level2', 'level3');
      
      await ensureDirectory(dirPath);
      
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('isValidPath', () => {
    it('should return true for existing file within allowed directory', async () => {
      const filePath = path.join(tempDir, 'test-file.txt');
      await fs.writeFile(filePath, 'test content');
      
      const result = await isValidPath(filePath, tempDir);
      
      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = path.join(tempDir, 'non-existent.txt');
      
      const result = await isValidPath(filePath, tempDir);
      
      expect(result).toBe(false);
    });

    it('should return false for file outside allowed directory', async () => {
      const outsidePath = path.join(os.tmpdir(), 'outside-file.txt');
      await fs.writeFile(outsidePath, 'test');
      
      try {
        const result = await isValidPath(outsidePath, tempDir);
        
        expect(result).toBe(false);
      } finally {
        await fs.unlink(outsidePath).catch(() => {});
      }
    });

    it('should return true for existing directory within allowed directory', async () => {
      const dirPath = path.join(tempDir, 'test-dir');
      await fs.mkdir(dirPath);
      
      const result = await isValidPath(dirPath, tempDir);
      
      expect(result).toBe(true);
    });
  });
});
