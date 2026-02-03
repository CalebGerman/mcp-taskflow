/**
 * Atomic JSON File Operations
 *
 * Implements atomic write using temp file + fsync + rename.
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { ensureDirectory } from '../config/pathResolver.js';

/**
 * Maximum number of retry attempts for file operations.
 */
const MAX_RETRIES = 5;

/**
 * Base delay in milliseconds for exponential backoff.
 */
const BASE_DELAY_MS = 100;

/**
 * File operation errors with detailed context
 */
export class FileOperationError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly operation: 'read' | 'write' | 'delete',
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'FileOperationError';
  }
}

/**
 * Parse JSON string and wrap errors
 */
function parseJson(content: string, filePath: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new FileOperationError(
      `Invalid JSON in file: ${filePath}`,
      filePath,
      'read',
      error
    );
  }
}

/**
 * Validate data with Zod schema and wrap errors
 */
function validateWithSchema<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  filePath: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new FileOperationError(
      `Schema validation failed for ${filePath}: ${result.error.message}`,
      filePath,
      'read',
      result.error
    );
  }
  return result.data;
}

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error: unknown): boolean {
  return (
    error instanceof FileOperationError ||
    (error instanceof Error && 'code' in error && error.code === 'ENOENT')
  );
}

/**
 * Read and parse JSON file with Zod schema validation.
 */
export async function readJsonFile<T>(
  filePath: string,
  schema: z.ZodSchema<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Read file content
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse and validate (these throw FileOperationError on failure)
      const parsed = parseJson(content, filePath);
      const validated = validateWithSchema(parsed, schema, filePath);

      return validated;
    } catch (error) {
      lastError = error;

      // Don't retry validation errors or ENOENT (file doesn't exist)
      if (isNonRetryableError(error)) {
        // If it's already a FileOperationError, throw it as-is
        if (error instanceof FileOperationError) {
          throw error;
        }
        // Wrap ENOENT in FileOperationError
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          throw new FileOperationError(
            `File not found: ${filePath}`,
            filePath,
            'read',
            error
          );
        }
        throw error;
      }

      // Retry on transient errors (EAGAIN, EBUSY, etc.)
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries exhausted
  throw new FileOperationError(
    `Failed to read file after ${MAX_RETRIES} attempts: ${filePath}`,
    filePath,
    'read',
    lastError
  );
}

/**
 * Write JSON file atomically using temp file + rename pattern.
 */
export async function writeJsonFile<T>(
  filePath: string,
  data: T,
  schema: z.ZodSchema<T>
): Promise<void> {
  // Validate data before any file operations
  const validationResult = schema.safeParse(data);
  if (!validationResult.success) {
    throw new FileOperationError(
      `Schema validation failed before write: ${validationResult.error.message}`,
      filePath,
      'write',
      validationResult.error
    );
  }

  // Ensure parent directory exists
  const dirPath = path.dirname(filePath);
  await ensureDirectory(dirPath);

  // Generate unique temp file path
  const tempPath = `${filePath}.tmp.${randomUUID().replace(/-/g, '')}`;

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Write to temporary file
      await writeJsonCore(tempPath, data);

      // Atomic rename
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await fs.rename(tempPath, filePath);

      // Success - clean exit
      return;
    } catch (error) {
      lastError = error;

      // Clean up temp file on failure
      await tryDeleteFile(tempPath);

      // Retry on transient errors
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries exhausted
  throw new FileOperationError(
    `Failed to write file after ${MAX_RETRIES} attempts: ${filePath}`,
    filePath,
    'write',
    lastError
  );
}

/**
 * Core write operation: serialize JSON and flush to disk.
 */
async function writeJsonCore<T>(filePath: string, data: T): Promise<void> {
  // Serialize with pretty-printing (2-space indentation)
  const json = JSON.stringify(data, null, 2);

  // Write to file
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const fileHandle = await fs.open(filePath, 'w');
  try {
    await fileHandle.writeFile(json, 'utf-8');
    
    // Flush OS buffers to disk
    await fileHandle.sync();
  } finally {
    await fileHandle.close();
  }
}

/**
 * Safely delete a file, ignoring errors.
 */
async function tryDeleteFile(filePath: string): Promise<void> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.unlink(filePath);
  } catch {
    // Ignore all errors - this is best-effort cleanup
  }
}

/**
 * Check if a file exists
 *
 * @param filePath - Absolute file path
 * @returns true if file exists, false otherwise
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read JSON file or return default value if file doesn't exist.
 */
export async function readJsonFileOrDefault<T>(
  filePath: string,
  schema: z.ZodSchema<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await readJsonFile(filePath, schema);
  } catch (error) {
    // Return default if file doesn't exist
    if (
      error instanceof FileOperationError &&
      error.originalError instanceof Error &&
      'code' in error.originalError &&
      error.originalError.code === 'ENOENT'
    ) {
      return defaultValue;
    }
    // Re-throw other errors (validation failures, permission errors, etc.)
    throw error;
  }
}

/**
 * List all files in a directory.
 */
export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile())
      .map(entry => entry.name);
  } catch (error) {
    throw new FileOperationError(
      `Failed to list files in directory: ${dirPath}`,
      dirPath,
      'read',
      error
    );
  }
}

/**
 * Delete a file with retry logic.
 */
export async function deleteFile(filePath: string): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await fs.unlink(filePath);
      return;
    } catch (error) {
      lastError = error;

      // Don't retry if file doesn't exist (already deleted)
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return;
      }

      // Retry on transient errors
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw new FileOperationError(
    `Failed to delete file after ${MAX_RETRIES} attempts: ${filePath}`,
    filePath,
    'delete',
    lastError
  );
}
