/**
 * MemoryStore - Task snapshot and history management
 *
 * Provides:
 * - Task snapshot creation and retrieval
 * - Historical task state management
 * - Backup functionality for task clearing
 *
 */

import { writeJsonFile, readJsonFile, fileExists, listFiles, deleteFile } from './fileOperations.js';
import { type TaskDocument, TaskDocumentSchema } from './schemas.js';
import { getDataPath } from '../config/pathResolver.js';
import path from 'path';

/**
 * Snapshot metadata
 */
export interface SnapshotInfo {
  /** Snapshot filename (without extension) */
  name: string;
  /** Full file path */
  path: string;
  /** Snapshot creation timestamp */
  timestamp: Date;
  /** Number of tasks in snapshot */
  taskCount: number;
}

/**
 * Maximum filename length to prevent filesystem issues
 */
const MAX_FILENAME_LENGTH = 100;

/**
 * Maximum snapshot file size (10MB) to prevent DoS
 */
const MAX_SNAPSHOT_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Memory subdirectory name
 */
const MEMORY_DIR = 'memory';

/**
 * Backup subdirectory name
 */
const BACKUP_DIR = 'backups';

/**
 * MemoryStore - Manages task snapshots and historical data
 */
export class MemoryStore {
  private readonly memoryDir: string;
  private readonly backupDir: string;

  /**
   * Create a new MemoryStore
   *
   * @param dataDir - Optional data directory override (for testing)
   */
  constructor(dataDir?: string) {
    const baseDir = dataDir ?? getDataPath('', dataDir);
    this.memoryDir = path.join(baseDir, MEMORY_DIR);
    this.backupDir = path.join(baseDir, BACKUP_DIR);
  }

  /**
   * Save a task snapshot with a descriptive name
   *
   * @param name - Snapshot name (will be sanitized)
   * @param document - Task document to snapshot
   * @returns Path to saved snapshot
   */
  public async saveSnapshotAsync(name: string, document: TaskDocument): Promise<string> {
    // Sanitize and validate filename
    const sanitizedName = this.sanitizeFilename(name);
    
    if (sanitizedName.length === 0) {
      throw new Error('Snapshot name cannot be empty after sanitization');
    }

    if (sanitizedName.length > MAX_FILENAME_LENGTH) {
      throw new Error(
        `Snapshot name too long (max ${MAX_FILENAME_LENGTH} characters after sanitization)`
      );
    }

    // Create snapshot filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sanitizedName}_${timestamp}.json`;
    const filePath = path.join(this.memoryDir, filename);

    // Validate file size before writing
    const jsonSize = JSON.stringify(document).length;
    if (jsonSize > MAX_SNAPSHOT_SIZE_BYTES) {
      throw new Error(
        `Snapshot too large (${jsonSize} bytes, max ${MAX_SNAPSHOT_SIZE_BYTES})`
      );
    }

    // Write snapshot atomically
    await writeJsonFile(filePath, document, TaskDocumentSchema);

    return filePath;
  }

  /**
   * Load a task snapshot by name
   *
   * @param name - Snapshot filename (with or without .json extension)
   * @returns Task document from snapshot
   */
  public async loadSnapshotAsync(name: string): Promise<TaskDocument> {
    // Add .json extension if not present
    const filename = name.endsWith('.json') ? name : `${name}.json`;
    const filePath = path.join(this.memoryDir, filename);

    // Validate path doesn't escape memory directory
    const resolvedPath = path.resolve(filePath);
    const resolvedMemoryDir = path.resolve(this.memoryDir);
    
    if (!resolvedPath.startsWith(resolvedMemoryDir)) {
      throw new Error('Invalid snapshot path: directory traversal detected');
    }

    // Check if file exists
    if (!(await fileExists(filePath))) {
      throw new Error(`Snapshot not found: ${name}`);
    }

    // Read and validate snapshot
    // Zod parsing ensures all defaults are applied
    const document = await readJsonFile(filePath, TaskDocumentSchema);
    // Return as TaskDocument (Zod ensures schema compliance including defaults)
    return document as TaskDocument;
  }

  /**
   * List all available snapshots
   *
   * @returns Array of snapshot metadata
   */
  public async listSnapshotsAsync(): Promise<SnapshotInfo[]> {
    // Ensure memory directory exists
    if (!(await fileExists(this.memoryDir))) {
      return [];
    }

    // List all JSON files in memory directory
    const allFiles = await listFiles(this.memoryDir);
    const files = allFiles.filter(f => f.endsWith('.json'));

    // Load metadata for each snapshot
    const snapshots: SnapshotInfo[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(this.memoryDir, file);
        const document = await readJsonFile(filePath, TaskDocumentSchema);

        // Extract timestamp from filename (format: name_YYYY-MM-DDTHH-MM-SS-sssZ.json)
        const timestampMatch = file.match(/_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.json$/);
        const timestamp = timestampMatch
          ? new Date(timestampMatch[1]!.replace(/-/g, ':').replace(/T(\d{2}):(\d{2}):(\d{2})/, 'T$1:$2:$3.'))
          : new Date();

        snapshots.push({
          name: file.replace(/\.json$/, ''),
          path: filePath,
          timestamp,
          taskCount: document.tasks?.length ?? 0,
        });
      } catch (error) {
        // Skip corrupted snapshots
        console.warn(`Failed to load snapshot ${file}:`, error);
      }
    }

    // Sort by timestamp (newest first)
    return snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Delete a snapshot by name
   *
   * @param name - Snapshot filename (with or without .json extension)
   * @returns True if deleted, false if not found
   */
  public async deleteSnapshotAsync(name: string): Promise<boolean> {
    const filename = name.endsWith('.json') ? name : `${name}.json`;
    const filePath = path.join(this.memoryDir, filename);

    // Validate path doesn't escape memory directory
    const resolvedPath = path.resolve(filePath);
    const resolvedMemoryDir = path.resolve(this.memoryDir);
    
    if (!resolvedPath.startsWith(resolvedMemoryDir)) {
      throw new Error('Invalid snapshot path: directory traversal detected');
    }

    // Check if file exists
    if (!(await fileExists(filePath))) {
      return false;
    }

    // Delete snapshot
    await deleteFile(filePath);
    return true;
  }

  /**
   * Create a backup of completed tasks
   * Used when clearing all tasks to preserve history
   *
   * @param document - Task document to backup
   * @returns Path to backup file
   */
  public async createBackupAsync(document: TaskDocument): Promise<string> {
    // Filter to only completed tasks
    const completedTasks = document.tasks.filter(t => t.status === 'completed');

    if (completedTasks.length === 0) {
      throw new Error('No completed tasks to backup');
    }

    const backupDocument: TaskDocument = {
      version: document.version,
      tasks: completedTasks,
    };

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.json`;
    const filePath = path.join(this.backupDir, filename);

    // Write backup atomically
    await writeJsonFile(filePath, backupDocument, TaskDocumentSchema);

    return filePath;
  }

  /**
   * Sanitize filename to prevent path traversal and filesystem issues
   *
   * Removes:
   * - Path separators (/, \)
   * - Null bytes
   * - Control characters
   * - Leading/trailing dots and spaces
   *
   * @param filename - Raw filename
   * @returns Sanitized filename safe for filesystem
   */
  private sanitizeFilename(filename: string): string {
    return filename
      // Remove path separators and null bytes
      .replace(/[/\\:\0]/g, '')
      // Remove control characters (ASCII 0-31, 127)
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Remove characters that are problematic on Windows
      .replace(/[<>:"|?*]/g, '')
      // Replace spaces with underscores
      .replace(/\s+/g, '_')
      // Remove leading/trailing dots and spaces
      .replace(/^[.\s]+|[.\s]+$/g, '')
      // Collapse multiple underscores
      .replace(/_+/g, '_');
  }
}
