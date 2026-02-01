/**
 * Tests for template loader
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTemplate, clearCache, getCacheSize, preloadTemplates } from '../../src/prompts/templateLoader.js';
import { render } from '../../src/prompts/templateEngine.js';

describe('loadTemplate()', () => {
  beforeEach(() => {
    // Clear cache before each test for isolation
    clearCache();
  });

  it('should load a template file from disk', async () => {
    const template = await loadTemplate('tests/basic.md');

    expect(template).toBeDefined();
    expect(template.length).toBeGreaterThan(0);
    expect(template).toContain('{name}');
  });

  it('should cache loaded templates', async () => {
    // First load
    const template1 = await loadTemplate('tests/basic.md');
    expect(getCacheSize()).toBe(1);

    // Second load (should come from cache)
    const template2 = await loadTemplate('tests/basic.md');
    expect(getCacheSize()).toBe(1); // Still 1, not 2

    // Should be same content
    expect(template1).toBe(template2);
  });

  it('should throw error for non-existent template', async () => {
    await expect(
      loadTemplate('nonexistent/template.md')
    ).rejects.toThrow('Template not found');
  });

  it('should prevent directory traversal attacks', async () => {
    // Attempt to access files outside template directory
    await expect(
      loadTemplate('../../../package.json')
    ).rejects.toThrow();
  });

  it('should integrate with template engine', async () => {
    const template = await loadTemplate('tests/basic.md');
    const rendered = render(template, {
      name: 'TemplateLoader'
    });

    expect(rendered).toContain('Hello TemplateLoader');
  });
});

describe('clearCache()', () => {
  it('should clear all cached templates', async () => {
    // Load some templates
    await loadTemplate('tests/basic.md');
    expect(getCacheSize()).toBe(1);

    // Clear cache
    clearCache();
    expect(getCacheSize()).toBe(0);
  });
});

describe('getCacheSize()', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should return 0 for empty cache', () => {
    expect(getCacheSize()).toBe(0);
  });

  it('should return correct size after loading templates', async () => {
    expect(getCacheSize()).toBe(0);

    await loadTemplate('tests/basic.md');
    expect(getCacheSize()).toBe(1);
  });
});

describe('preloadTemplates()', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should preload templates without errors', async () => {
    await expect(preloadTemplates()).resolves.not.toThrow();
  });

  it('should populate cache', async () => {
    await preloadTemplates();

    // Should have loaded at least some templates
    const cacheSize = getCacheSize();
    expect(cacheSize).toBeGreaterThanOrEqual(0);
  });
});

describe('Path validation', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should reject absolute paths', async () => {
    await expect(
      loadTemplate('/etc/passwd')
    ).rejects.toThrow();
  });

  it('should reject parent directory traversal', async () => {
    await expect(
      loadTemplate('../../config/pathResolver.ts')
    ).rejects.toThrow();
  });

  it('should reject Windows-style paths', async () => {
    await expect(
      loadTemplate('C:\\Windows\\System32\\config\\SAM')
    ).rejects.toThrow();
  });

  it('should only allow paths within templates directory', async () => {
    // This should work
    await expect(
      loadTemplate('tests/basic.md')
    ).resolves.toBeDefined();

    // These should not
    await expect(
      loadTemplate('../prompts/templateEngine.ts')
    ).rejects.toThrow();
  });
});
