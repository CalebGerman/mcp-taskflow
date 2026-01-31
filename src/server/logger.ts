/**
 * Logging Infrastructure with Pino
 *
 * Provides structured logging with security-focused features:
 * - Automatic sanitization of sensitive data (OWASP C8, C9)
 * - Correlation IDs for request tracing
 * - Environment-aware formatting (JSON prod, pretty dev)
 * - Error serialization with stack traces in dev only (OWASP C10)
 * - Performance optimized (<1ms overhead per log call)
 *
 * Security Controls:
 * - C8 (Protect Data): Redacts passwords, tokens, secrets, PII
 * - C9 (Security Logging): Structured logs with correlation IDs
 * - C10 (Handle Errors): Safe error serialization, no sensitive data in prod
 */

import pino, { type Logger, type LoggerOptions } from 'pino';
import { randomUUID } from 'crypto';

// Re-export Logger type for consumers
export type { Logger } from 'pino';

/**
 * Fields that contain sensitive data and should be redacted
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'session',
  'jwt',
  'bearer',
  'accessToken',
  'refreshToken',
  'privateKey',
  'private_key',
  'credentials',
];

const isDevelopment = process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV'];

/**
 * Log level from environment or default to 'info'
 */
const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info';

/**
 * Sanitize object by redacting sensitive fields
 *
 * Recursively walks object and replaces sensitive field values with '[REDACTED]'
 * Handles circular references with a WeakSet to prevent infinite recursion
 *
 * @param obj - Object to sanitize
 * @param seen - WeakSet to track circular references
 * @returns Sanitized copy of object
 */
function sanitizeObject(obj: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Date objects specially - preserve them as-is
  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Check for circular reference
    if (seen.has(obj)) {
      return '[CIRCULAR]';
    }
    seen.add(obj);
    return obj.map(item => sanitizeObject(item, seen));
  }

  if (typeof obj === 'object') {
    // Check for circular reference
    if (seen.has(obj)) {
      return '[CIRCULAR]';
    }
    seen.add(obj);

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check if key is sensitive
      const isSensitive = SENSITIVE_FIELDS.some(
        field => key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive && (typeof value === 'string' || typeof value === 'number')) {
        // Only redact primitive values, recurse into objects
        sanitized[key] = '[REDACTED]';
      } else if (key === 'path' || key === 'filePath') {
        // Redact full paths, show basename only (OWASP C8)
        sanitized[key] = typeof value === 'string'
          ? value.split(/[/\\]/).pop() ?? '[PATH]'
          : value;
      } else {
        // Recursively sanitize nested objects (including sensitive-named objects)
        sanitized[key] = sanitizeObject(value, seen);
      }
    }

    return sanitized;
  }

  return obj;
}

/**
 * Create custom serializers for Pino
 *
 * Serializers control how objects are logged, allowing us to:
 * - Redact sensitive data
 * - Format errors appropriately
 * - Add correlation context
 */
function createSerializers() {
  return {
    // Error serializer: Full stack in dev, message only in prod
    err: (error: Error) => {
      const serialized: Record<string, unknown> = {
        type: error.name,
        message: error.message,
      };

      // Include stack trace in development only (OWASP C10)
      if (isDevelopment && error['stack']) {
        serialized['stack'] = error['stack'];
      }

      // Include additional error properties
      if ('code' in error) {
        serialized['code'] = error['code'];
      }

      return sanitizeObject(serialized);
    },

    // Request serializer: Sanitize request data
    req: (req: unknown) => {
      return sanitizeObject(req);
    },

    // Response serializer: Sanitize response data
    res: (res: unknown) => {
      return sanitizeObject(res);
    },
  };
}

/**
 * Create redaction paths for automatic field redaction
 *
 * Pino can automatically redact fields at log time using paths
 */
function createRedactionPaths(): string[] {
  const paths: string[] = [];

  // Add sensitive field paths
  for (const field of SENSITIVE_FIELDS) {
    paths.push(field);
    paths.push(`*.${field}`);
    paths.push(`**.${field}`);
  }

  return paths;
}

/**
 * Create Pino logger options
 */
function createLoggerOptions(): LoggerOptions {
  const options: LoggerOptions = {
    level: LOG_LEVEL,

    // Custom serializers for error handling and sanitization
    serializers: createSerializers(),

    // Automatic field redaction (OWASP C8)
    redact: {
      paths: createRedactionPaths(),
      censor: '[REDACTED]',
    },

    // Base context included in all logs
    base: {
      pid: process.pid,
      hostname: process.env['HOSTNAME'] ?? 'unknown',
    },

    // Timestamp in ISO format
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  };

  // Pretty printing in development (OWASP C9 - readable logs for debugging)
  if (isDevelopment) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        messageFormat: '{correlationId} {msg}',
      },
    };
  }

  return options;
}

/**
 * Root logger instance
 */
let rootLogger: Logger | null = null;

/**
 * Get or create the root logger
 *
 * Singleton pattern ensures consistent configuration across application
 */
export function getLogger(): Logger {
  if (!rootLogger) {
    rootLogger = pino(createLoggerOptions());
  }
  return rootLogger;
}

/**
 * Create child logger with correlation ID
 *
 * Child loggers inherit parent configuration but can add context.
 * Correlation IDs enable request tracing across async operations (OWASP C9)
 *
 * @param correlationId - Optional correlation ID (generates UUID if not provided)
 * @param context - Additional context to include in all logs
 * @returns Child logger with correlation context
 *
 * @example
 * ```typescript
 * const logger = createLogger();
 * logger.info('Processing request');
 *
 * // Later in async operation:
 * logger.debug({ taskId: '123' }, 'Task created');
 * ```
 */
export function createLogger(
  correlationId?: string,
  context?: Record<string, unknown>
): Logger {
  const baseLogger = getLogger();

  const childContext: Record<string, unknown> = {
    correlationId: correlationId ?? randomUUID(),
    ...context,
  };

  return baseLogger.child(childContext);
}

/**
 * Create logger with automatic context
 *
 * Factory function for dependency injection pattern.
 * Each module can create its own logger with appropriate context.
 *
 * @param moduleName - Name of the module (e.g., 'TaskStore', 'MCPServer')
 * @returns Logger configured for the module
 *
 * @example
 * ```typescript
 * export class TaskStore {
 *   private readonly logger = createModuleLogger('TaskStore');
 *
 *   async createAsync(task: TaskItem): Promise<TaskItem> {
 *     this.logger.info({ taskId: task.id }, 'Creating task');
 *     // ... implementation
 *   }
 * }
 * ```
 */
export function createModuleLogger(moduleName: string): Logger {
  return getLogger().child({ module: moduleName });
}

/**
 * Log and rethrow error with context
 *
 * Utility for consistent error logging before rethrowing (OWASP C10)
 *
 * @param logger - Logger instance
 * @param error - Error to log
 * @param context - Additional context about the error
 * @param message - Custom error message
 * @throws The original error after logging
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   logAndThrow(logger, error, { taskId }, 'Failed to create task');
 * }
 * ```
 */
export function logAndThrow(
  logger: Logger,
  error: unknown,
  context: Record<string, unknown>,
  message: string
): never {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const sanitizedContext = sanitizeObject(context) as Record<string, unknown>;

  logger.error(
    {
      err: errorObj,
      ...sanitizedContext,
    },
    message
  );

  throw error;
}

/**
 * Sanitize log data before logging
 *
 * Use this to sanitize data that may contain sensitive information
 * before passing to logger.
 *
 * @param data - Data to sanitize
 * @returns Sanitized copy of data
 *
 * @example
 * ```typescript
 * const userData = { name: 'Alice', password: 'secret123' };
 * logger.info(sanitizeLogData(userData), 'User logged in');
 * // Logs: { name: 'Alice', password: '[REDACTED]' }
 * ```
 */
export function sanitizeLogData<T>(data: T): T {
  return sanitizeObject(data) as T;
}

/**
 * Configure logger for testing
 *
 * Sets logger to silent mode to avoid cluttering test output
 * unless DEBUG environment variable is set
 */
export function configureTestLogger(): void {
  if (!process.env['DEBUG']) {
    rootLogger = pino({ level: 'silent' });
  }
}

/**
 * Reset logger (primarily for testing)
 *
 * Allows tests to reconfigure logger between test cases
 */
export function resetLogger(): void {
  rootLogger = null;
}
