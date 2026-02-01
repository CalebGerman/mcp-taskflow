/**
 * RulesStore - Project-specific coding rules management
 *
 * Provides:
 * - Loading and saving project coding standards
 * - Markdown-based rules storage
 * - Validation and size limits
 *
 * Security Controls:
 * - Input validation (markdown size limits)
 * - Path validation (fixed filename, no traversal)
 */

import { fileExists } from './fileOperations.js';
import { getDataPath } from '../config/pathResolver.js';
import fs from 'fs/promises';

/**
 * Project rules filename
 */
const RULES_FILENAME = 'shrimp-rules.md';

/**
 * Maximum rules file size (1MB) to prevent DoS
 */
const MAX_RULES_SIZE_BYTES = 1 * 1024 * 1024;

/**
 * Default rules template
 */
const DEFAULT_RULES_TEMPLATE = `# Project Coding Standards

## Overview
Document your project-specific coding standards, patterns, and conventions here.

## Code Style
- Formatting rules
- Naming conventions
- File organization

## Architecture Patterns
- Design patterns used
- Module structure
- Dependency guidelines

## Security Guidelines
- Security controls applicable
- Authentication/authorization patterns
- Data validation requirements

## Testing Standards
- Test coverage requirements
- Testing patterns
- Mock strategies

## Documentation
- Comment requirements
- API documentation
- README guidelines

---

**Last Updated**: ${new Date().toISOString().split('T')[0]}
`;

/**
 * RulesStore - Manages project-specific coding rules
 */
export class RulesStore {
  private readonly rulesFilePath: string;

  /**
   * Create a new RulesStore
   *
   * @param dataDir - Optional data directory override (for testing)
   */
  constructor(dataDir?: string) {
    this.rulesFilePath = getDataPath(RULES_FILENAME, dataDir);
  }

  /**
   * Check if project rules exist
   *
   * @returns True if rules file exists
   */
  public async rulesExistAsync(): Promise<boolean> {
    return await fileExists(this.rulesFilePath);
  }

  /**
   * Load project rules
   *
   * @returns Rules content as markdown string
   */
  public async loadRulesAsync(): Promise<string> {
    if (!(await this.rulesExistAsync())) {
      throw new Error('Project rules not found. Initialize rules first.');
    }

    // Read rules file
    const content = await fs.readFile(this.rulesFilePath, 'utf-8');

    // Validate size
    if (content.length > MAX_RULES_SIZE_BYTES) {
      throw new Error(
        `Rules file too large (${content.length} bytes, max ${MAX_RULES_SIZE_BYTES})`
      );
    }

    return content;
  }

  /**
   * Save project rules
   *
   * Validates markdown content and size before saving
   *
   * @param content - Rules content as markdown string
   */
  public async saveRulesAsync(content: string): Promise<void> {
    // Validate content
    if (content.trim().length === 0) {
      throw new Error('Rules content cannot be empty');
    }

    // Validate size
    const sizeBytes = Buffer.byteLength(content, 'utf-8');
    if (sizeBytes > MAX_RULES_SIZE_BYTES) {
      throw new Error(
        `Rules content too large (${sizeBytes} bytes, max ${MAX_RULES_SIZE_BYTES})`
      );
    }

    // Basic markdown validation (check for common markdown headers)
    if (!content.includes('#')) {
      console.warn('Rules content does not contain markdown headers');
    }

    // Write rules file atomically
    // Use temp file + rename pattern for atomicity
    const tempPath = `${this.rulesFilePath}.tmp`;

    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, this.rulesFilePath);
    } catch (error) {
      // Cleanup temp file on failure
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Initialize project rules with default template
   *
   * Only creates file if it doesn't already exist
   *
   * @returns True if created, false if already exists
   */
  public async initializeRulesAsync(): Promise<boolean> {
    if (await this.rulesExistAsync()) {
      return false;
    }

    await this.saveRulesAsync(DEFAULT_RULES_TEMPLATE);
    return true;
  }

  /**
   * Update project rules (append or replace sections)
   *
   * @param updates - Markdown content to append or section replacements
   * @param mode - 'append' to add to end, 'replace' to overwrite
   */
  public async updateRulesAsync(
    updates: string,
    mode: 'append' | 'replace' = 'append'
  ): Promise<void> {
    // Validate updates content
    if (updates.trim().length === 0) {
      throw new Error('Rules content cannot be empty');
    }

    let content: string;

    if (mode === 'replace') {
      // Replace entire content
      content = updates;
    } else {
      // Append to existing content
      const existing = await this.rulesExistAsync()
        ? await this.loadRulesAsync()
        : '';

      content = existing ? `${existing}\n\n${updates}` : updates;
    }

    await this.saveRulesAsync(content);
  }

  /**
   * Delete project rules
   *
   * @returns True if deleted, false if didn't exist
   */
  public async deleteRulesAsync(): Promise<boolean> {
    if (!(await this.rulesExistAsync())) {
      return false;
    }

    await fs.unlink(this.rulesFilePath);
    return true;
  }
}
