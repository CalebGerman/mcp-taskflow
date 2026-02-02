/**
 * Template loader for loading and caching markdown template files.
 *
 * Loads template files from the filesystem and caches them for performance.
 * Templates are stored in src/prompts/templates/v1/templates_en/ directory.
 *
 * Security:
 * - Path traversal prevention via pathResolver
 * - Only loads .md files from designated template directory
 * - No dynamic template generation
 *
 * @module prompts/templateLoader
 */

import { readFile } from 'node:fs/promises';
import { resolveTemplatePath } from '../config/pathResolver.js';
import { createLogger } from '../server/logger.js';

const logger = createLogger(undefined, { component: 'TemplateLoader' });

/**
 * In-memory cache for compiled templates.
 * Key: template path (e.g., "analyzeTask/index.md")
 * Value: template content as string
 *
 * Performance: Caching prevents repeated disk I/O.
 * Memory: For ~70 templates @ ~500 bytes each = ~35KB total (negligible)
 */
const templateCache = new Map<string, string>();

/**
 * Loads a template file from disk with caching.
 *
 * Template Path Format:
 * - Relative to templates directory: "analyzeTask/index.md"
 * - Actual filesystem path: src/prompts/templates/v1/templates_en/analyzeTask/index.md
 *
 * Security:
 * - Uses resolveTemplatePath() which prevents directory traversal
 * - Only .md files are loaded (enforced by path resolver)
 * - Template paths are validated against allowlist
 *
 * Performance:
 * - First call: Reads from disk (~1-5ms)
 * - Subsequent calls: Returns cached value (~0.01ms)
 * - Cache persists for application lifetime (no invalidation needed - templates are static)
 *
 * Error Handling:
 * - File not found: Throws descriptive error with sanitized path
 * - Invalid path: Throws error from pathResolver
 * - Read errors: Logs and rethrows with context
 *
 * @param templatePath - Relative path to template (e.g., "analyzeTask/index.md")
 * @returns Template content as string
 * @throws {Error} If template file not found or cannot be read
 *
 * @example
 * ```typescript
 * const template = await loadTemplate('analyzeTask/index.md');
 * // Returns: "**Please strictly follow the guidelines below**\n\n..."
 * ```
 */
export async function loadTemplate(templatePath: string): Promise<string> {
  // Check cache first (fast path)
  const cached = templateCache.get(templatePath);
  if (cached !== undefined) {
    logger.debug(`Template cache hit: ${templatePath}`);
    return cached;
  }

  // Security: Validate and resolve template path (prevents directory traversal)
  const absolutePath = resolveTemplatePath(templatePath);

  try {
    logger.debug(`Loading template from disk: ${templatePath}`);

    // Read template file (UTF-8 encoding for markdown)
    const content = await readFile(absolutePath, 'utf-8');

    // Cache for future requests
    templateCache.set(templatePath, content);

    logger.info(`Template loaded and cached: ${templatePath} (${content.length} bytes)`);
    return content;
  } catch (error) {
    // Security: Don't leak filesystem details in error messages
    const safeMessage = `Failed to load template: ${templatePath}`;
    logger.error(safeMessage, { error });

    // Provide helpful error for missing templates
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Template not found: ${templatePath}. ` +
        `Ensure the file exists in templates/v1/templates_en/`
      );
    }

    throw new Error(safeMessage, { cause: error });
  }
}

/**
 * Preloads commonly used templates into cache at startup.
 *
 * Benefits:
 * - Reduces latency for first requests (no disk I/O)
 * - Validates templates exist at startup (fail-fast)
 * - Minimal memory overhead (~35KB for all templates)
 *
 * Call this during application initialization, not on every request.
 *
 * @example
 * ```typescript
 * // In server startup:
 * await preloadTemplates();
 * ```
 */
export async function preloadTemplates(): Promise<void> {
  const commonTemplates = [
    'planTask/index.md',
    'analyzeTask/index.md',
    'executeTask/index.md',
    'listTasks/index.md',
    'getTaskDetail/index.md',
    'verifyTask/index.md',
    'processThought/index.md',
    'researchMode/index.md'
  ];

  logger.info(`Preloading ${commonTemplates.length} common templates...`);

  const results = await Promise.allSettled(
    commonTemplates.map(path => loadTemplate(path))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  if (failed > 0) {
    logger.warn(`Preloaded ${succeeded}/${commonTemplates.length} templates (${failed} failed)`);
  } else {
    logger.info(`Successfully preloaded all ${succeeded} templates`);
  }
}

/**
 * Clears the template cache.
 * Useful for testing or hot-reload during development.
 *
 * **WARNING**: Only call this during development or tests.
 * In production, templates are static and should stay cached.
 *
 * @example
 * ```typescript
 * // In test cleanup:
 * clearCache();
 * ```
 */
export function clearCache(): void {
  const size = templateCache.size;
  templateCache.clear();
  logger.debug(`Template cache cleared (${size} entries removed)`);
}

/**
 * Gets the current cache size (number of cached templates).
 * Useful for monitoring and debugging.
 *
 * @returns Number of cached templates
 */
export function getCacheSize(): number {
  return templateCache.size;
}
