/**
 * Path resolution and sanitization utilities
 *
 * Prevents directory traversal through path validation and normalization.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Get the current file's directory (ESM equivalent of __dirname)
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve workspace root directory
 * Priority order (mirrors C# PathResolver):
 * 1. MCP_WORKSPACE_ROOT environment variable
 * 2. Current working directory
 * 3. User home directory (fallback)
 */
export function resolveWorkspaceRoot(): string {
  // Priority 1: Environment variable
  if (process.env['MCP_WORKSPACE_ROOT']) {
    return path.resolve(process.env['MCP_WORKSPACE_ROOT']);
  }

  // Priority 2: Current working directory
  const cwd = process.cwd();

  // Protected directories check (don't use system directories)
  const protectedDirs = [
    '/etc',
    '/usr',
    '/bin',
    '/sbin',
    '/sys',
    '/proc',
    'C:\\Windows',
    'C:\\Program Files',
  ];

  const isProtected = protectedDirs.some(dir =>
    cwd.toLowerCase().startsWith(dir.toLowerCase())
  );

  if (!isProtected) {
    return cwd;
  }

  // Priority 3: User home directory (fallback)
  const homeDir = process.env['HOME'] || process.env['USERPROFILE'];
  if (homeDir) {
    return homeDir;
  }

  // Last resort: current directory
  return cwd;
}

/**
 * Resolve data directory path
 * Uses DATA_DIR environment variable or defaults to .mcp-tasks
 */
export function resolveDataDir(): string {
  const workspaceRoot = resolveWorkspaceRoot();
  const dataDirName = process.env['DATA_DIR'] || '.mcp-tasks';

  // If DATA_DIR is absolute, use it directly
  if (path.isAbsolute(dataDirName)) {
    return dataDirName;
  }

  // Otherwise, relative to workspace root
  return path.join(workspaceRoot, dataDirName);
}

/**
 * Sanitize a user-provided file path
 *
 * Prevents directory traversal by ensuring paths stay within the allowed base directory.
 *
 * @param userPath - Path from user input (potentially untrusted)
 * @param baseDir - Base directory (must be absolute)
 * @returns Sanitized absolute path
 * @throws Error if path escapes baseDir
 *
 * Examples:
 *   sanitizePath('tasks.json', '/app/.mcp-tasks') → '/app/.mcp-tasks/tasks.json'
 *   sanitizePath('../../../etc/passwd', '/app/.mcp-tasks') → ERROR: Access denied
 */
export function sanitizePath(userPath: string, baseDir: string): string {
  // Ensure baseDir is absolute
  const absoluteBaseDir = path.resolve(baseDir);

  // Resolve user path relative to base directory
  const resolvedPath = path.resolve(absoluteBaseDir, userPath);

  // Verify path is within baseDir to prevent directory traversal
  // Example: userPath = "../../etc/passwd" would resolve outside baseDir
  if (!resolvedPath.startsWith(absoluteBaseDir + path.sep) &&
      resolvedPath !== absoluteBaseDir) {
    throw new Error(
      `Access denied: path '${userPath}' resolves outside allowed directory`
    );
  }

  return resolvedPath;
}

/**
 * Get sanitized path within data directory
 *
 * @param relativePath - Path relative to data directory
 * @param dataDirOverride - Optional data directory override (for testing)
 * @returns Sanitized absolute path
 * @throws Error if path escapes data directory
 *
 * Example:
 *   getDataPath('tasks.json') → '/app/.mcp-tasks/tasks.json'
 *   getDataPath('../../../etc/passwd') → ERROR: Access denied
 */
export function getDataPath(relativePath: string, dataDirOverride?: string): string {
  const dataDir = dataDirOverride ?? resolveDataDir();
  return sanitizePath(relativePath, dataDir);
}

/**
 * Ensure directory exists, creating it if necessary
 *
 * Note: Paths should be validated before calling to ensure they're within allowed directories.
 *
 * @param dirPath - Directory path to ensure exists
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  const fs = await import('fs/promises');

  try {
    await fs.access(dirPath);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Validate that a path exists and is within allowed directory
 *
 * @param filePath - Absolute file path
 * @param allowedDir - Allowed base directory
 * @returns true if valid, false otherwise
 */
export async function isValidPath(
  filePath: string,
  allowedDir: string
): Promise<boolean> {
  try {
    // Check containment
    const absoluteAllowedDir = path.resolve(allowedDir);
    if (!filePath.startsWith(absoluteAllowedDir)) {
      return false;
    }

    // Check existence
    const fs = await import('fs/promises');
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve template file path
 * Templates are stored in src/prompts/templates/v1/templates_en/
 *
 * @param templatePath - Relative template path (e.g., "analyzeTask/index.md")
 * @returns Absolute path to template file
 * @throws Error if path attempts directory traversal
 */
export function resolveTemplatePath(templatePath: string): string {
  // Get the source directory (where compiled JS files are)
  // In development: dist/config/pathResolver.js -> dist/
  // In production: dist/config/pathResolver.js -> dist/
  const distDir = path.resolve(__dirname, '..');

  // Templates are in dist/prompts/templates/v1/templates_en/
  const templatesBaseDir = path.join(distDir, 'prompts', 'templates', 'v1', 'templates_en');

  // Sanitize to prevent directory traversal
  return sanitizePath(templatePath, templatesBaseDir);
}
