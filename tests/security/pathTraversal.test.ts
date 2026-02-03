/**
 * Security tests: path traversal defenses
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  sanitizePath,
  getDataPath,
  isValidPath,
} from '../../src/config/pathResolver.js';

describe('Security: path traversal defenses', () => {
  let tempDir: string;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `security-path-${timestamp}-${random}-`));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up ${tempDir}:`, error);
    }
  });

  it('should block traversal with ../ sequences', () => {
    expect(() => sanitizePath('../../etc/passwd', tempDir)).toThrow(/Access denied/);
  });

  it('should block traversal with backslashes', () => {
    expect(() => sanitizePath('..\\..\\secret.txt', tempDir)).toThrow(/Access denied/);
  });

  it('should block traversal with mixed separators', () => {
    expect(() => sanitizePath('..\\../secret.txt', tempDir)).toThrow(/Access denied/);
  });

  it('should block absolute paths', () => {
    const absolute = process.platform === 'win32'
      ? 'C:\\Windows\\System32\\drivers\\etc\\hosts'
      : '/etc/passwd';
    expect(() => sanitizePath(absolute, tempDir)).toThrow(/Access denied/);
  });

  it('should allow safe relative paths', () => {
    const result = sanitizePath('tasks.json', tempDir);
    expect(result).toBe(path.join(tempDir, 'tasks.json'));
  });

  it('should prevent traversal via getDataPath', () => {
    expect(() => getDataPath('../../../etc/passwd', tempDir)).toThrow(/Access denied/);
  });

  it('should reject existing files outside allowed directory', async () => {
    const outsideFile = path.join(os.tmpdir(), 'outside-security-test.txt');
    await fs.writeFile(outsideFile, 'test');

    try {
      const result = await isValidPath(outsideFile, tempDir);
      expect(result).toBe(false);
    } finally {
      await fs.unlink(outsideFile).catch(() => {});
    }
  });
});
