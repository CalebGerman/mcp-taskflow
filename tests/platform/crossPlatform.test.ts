import path from 'path';
import { describe, expect, it } from 'vitest';
import { resolveDataDir, sanitizePath } from '../../src/config/pathResolver.js';

describe('Cross-platform path handling', () => {
  it('resolves data dir to an absolute path', () => {
    const original = process.env['DATA_DIR'];
    process.env['DATA_DIR'] = '.mcp-tasks';

    try {
      const dataDir = resolveDataDir();
      expect(path.isAbsolute(dataDir)).toBe(true);
    } finally {
      if (original === undefined) {
        delete process.env['DATA_DIR'];
      } else {
        process.env['DATA_DIR'] = original;
      }
    }
  });

  it('sanitizes safe relative paths within the base directory', () => {
    const baseDir = path.join(process.cwd(), 'tmp', 'base');
    const relative = path.join('logs', 'today.log');

    const resolved = sanitizePath(relative, baseDir);

    expect(resolved).toBe(path.resolve(baseDir, relative));
  });

  it('rejects traversal using native separators', () => {
    const baseDir = path.join(process.cwd(), 'tmp', 'base');
    const traversal = ['..', '..', 'outside.txt'].join(path.sep);

    expect(() => sanitizePath(traversal, baseDir)).toThrow(/Access denied/);
  });

  it('rejects Windows-style traversal on Windows', () => {
    if (path.sep !== '\\') {
      return;
    }

    const baseDir = path.join(process.cwd(), 'tmp', 'base');
    const traversal = '..\\..\\outside.txt';

    expect(() => sanitizePath(traversal, baseDir)).toThrow(/Access denied/);
  });
});
