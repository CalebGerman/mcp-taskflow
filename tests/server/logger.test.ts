/**
 * Tests for Logger Infrastructure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLogger,
  createLogger,
  createModuleLogger,
  sanitizeLogData,
  logAndThrow,
} from '../../src/server/logger.js';
import { createSilentLogger } from '../support/testLogger.js';
import type { Logger } from 'pino';

describe('Logger', () => {
  beforeEach(() => {
    createSilentLogger();
  });

  describe('getLogger', () => {
    it('should create a logger instance', () => {
      const logger = getLogger();
      expect(logger).toBeDefined();
    });

    it('should return same instance on subsequent calls (singleton)', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });
  });

  describe('createLogger', () => {
    it('should accept custom correlation ID', () => {
      const logger = createLogger('test-correlation-id');
      const bindings = (logger as Logger).bindings();
      expect(bindings.correlationId).toBe('test-correlation-id');
    });

    it('should generate correlation ID when not provided', () => {
      const logger = createLogger();
      const bindings = (logger as Logger).bindings();
      expect(bindings).toHaveProperty('correlationId');
      expect(typeof bindings.correlationId).toBe('string');
    });

    it('should merge additional context into logger', () => {
      const context = { taskId: 'task-123', userId: 'user-456' };
      const logger = createLogger('correlation-id', context);
      const bindings = (logger as Logger).bindings();
      expect(bindings.taskId).toBe('task-123');
      expect(bindings.userId).toBe('user-456');
    });
  });

  describe('createModuleLogger', () => {
    it('should set module name in context', () => {
      const logger = createModuleLogger('TaskStore');
      const bindings = (logger as Logger).bindings();
      expect(bindings.module).toBe('TaskStore');
    });
  });

  describe('sanitizeLogData', () => {
    it('should redact password fields', () => {
      const data = {
        username: 'alice',
        password: 'secret123',
        email: 'alice@example.com',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.username).toBe('alice');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.email).toBe('alice@example.com');
    });

    it('should redact token fields', () => {
      const data = {
        user: 'alice',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        apiKey: 'sk-1234567890',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.user).toBe('alice');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
    });

    it('should redact authorization headers', () => {
      const data = {
        method: 'POST',
        authorization: 'Bearer token123',
        cookie: 'session=abc123',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.method).toBe('POST');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.cookie).toBe('[REDACTED]');
    });

    it('should redact nested sensitive fields', () => {
      const data = {
        user: {
          name: 'alice',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
      };

      const sanitized = sanitizeLogData(data) as Record<string, unknown>;
      const user = sanitized.user as Record<string, unknown>;
      const credentials = user.credentials as Record<string, unknown>;

      expect(user.name).toBe('alice');
      expect(credentials.password).toBe('[REDACTED]');
      expect(credentials.apiKey).toBe('[REDACTED]');
    });

    it('should redact file paths, showing basename only', () => {
      const data = {
        operation: 'read',
        path: '/home/user/sensitive/data.json',
        filePath: 'C:\\Users\\Alice\\Documents\\secret.txt',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.operation).toBe('read');
      expect(sanitized.path).toBe('data.json');
      expect(sanitized.filePath).toBe('secret.txt');
    });

    it('should handle arrays correctly', () => {
      const data = {
        users: [
          { name: 'alice', password: 'secret1' },
          { name: 'bob', password: 'secret2' },
        ],
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.users).toHaveLength(2);
      expect(sanitized.users[0].name).toBe('alice');
      expect(sanitized.users[0].password).toBe('[REDACTED]');
      expect(sanitized.users[1].name).toBe('bob');
      expect(sanitized.users[1].password).toBe('[REDACTED]');
    });

    it('should handle null and undefined values', () => {
      const data = {
        value1: null,
        value2: undefined,
        value3: 'valid',
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.value1).toBeNull();
      expect(sanitized.value2).toBeUndefined();
      expect(sanitized.value3).toBe('valid');
    });

    it('should handle primitive values', () => {
      expect(sanitizeLogData('string')).toBe('string');
      expect(sanitizeLogData(123)).toBe(123);
      expect(sanitizeLogData(true)).toBe(true);
      expect(sanitizeLogData(null)).toBeNull();
    });

    it('should not mutate original object', () => {
      const original = {
        username: 'alice',
        password: 'secret',
      };

      const sanitized = sanitizeLogData(original);

      expect(original.password).toBe('secret'); // Original unchanged
      expect(sanitized.password).toBe('[REDACTED]'); // Sanitized copy
    });
  });

  describe('logAndThrow', () => {
    it('should log error and rethrow', () => {
      const logger = createLogger();
      const errorSpy = vi.spyOn(logger, 'error');

      const error = new Error('Test error');
      const context = { taskId: 'task-123' };

      expect(() => {
        logAndThrow(logger, error, context, 'Operation failed');
      }).toThrow('Test error');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(Object),
          taskId: 'task-123',
        }),
        'Operation failed'
      );
    });

    it('should sanitize context before logging', () => {
      const logger = createLogger();
      const errorSpy = vi.spyOn(logger, 'error');

      const error = new Error('Auth error');
      const context = {
        username: 'alice',
        password: 'secret123',
      };

      expect(() => {
        logAndThrow(logger, error, context, 'Authentication failed');
      }).toThrow('Auth error');

      const loggedData = errorSpy.mock.calls[0][0] as Record<string, unknown>;
      expect(loggedData.password).toBe('[REDACTED]');
    });

    it('should handle non-Error objects', () => {
      const logger = createLogger();
      const errorSpy = vi.spyOn(logger, 'error');

      const error = 'String error';
      const context = { operation: 'test' };

      expect(() => {
        logAndThrow(logger, error, context, 'Failed');
      }).toThrow('String error');

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('sensitive data handling', () => {
    it('should never log passwords in plain text', () => {
      const logger = createLogger();
      const logSpy = vi.spyOn(logger, 'info');

      const userData = {
        username: 'alice',
        password: 'secret123',
        email: 'alice@example.com',
      };

      logger.info(sanitizeLogData(userData), 'User data');

      const loggedData = logSpy.mock.calls[0][0] as Record<string, unknown>;
      expect(JSON.stringify(loggedData)).not.toContain('secret123');
      expect(loggedData.password).toBe('[REDACTED]');
    });

    it('should never log API keys in plain text', () => {
      const logger = createLogger();
      const logSpy = vi.spyOn(logger, 'info');

      const config = {
        service: 'api',
        apiKey: 'sk-1234567890abcdef',
        endpoint: 'https://api.example.com',
      };

      logger.info(sanitizeLogData(config), 'API config');

      const loggedData = logSpy.mock.calls[0][0] as Record<string, unknown>;
      expect(JSON.stringify(loggedData)).not.toContain('sk-1234567890abcdef');
      expect(loggedData.apiKey).toBe('[REDACTED]');
    });

    it('should never log tokens in plain text', () => {
      const logger = createLogger();
      const logSpy = vi.spyOn(logger, 'warn');

      const authData = {
        user: 'alice',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refreshToken: 'refresh_abc123',
      };

      logger.warn(sanitizeLogData(authData), 'Token refresh');

      const loggedData = logSpy.mock.calls[0][0] as Record<string, unknown>;
      expect(JSON.stringify(loggedData)).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(loggedData.accessToken).toBe('[REDACTED]');
      expect(loggedData.refreshToken).toBe('[REDACTED]');
    });

    it('should redact full file paths', () => {
      const logger = createLogger();
      const logSpy = vi.spyOn(logger, 'debug');

      const fileOp = {
        operation: 'write',
        path: '/home/alice/sensitive/credentials.json',
        size: 1024,
      };

      logger.debug(sanitizeLogData(fileOp), 'File operation');

      const loggedData = logSpy.mock.calls[0][0] as Record<string, unknown>;
      expect(loggedData.path).toBe('credentials.json'); // Basename only
      expect(JSON.stringify(loggedData)).not.toContain('/home/alice');
    });

    it('should handle deeply nested sensitive data', () => {
      const logger = createLogger();
      const logSpy = vi.spyOn(logger, 'info');

      const complexData = {
        user: {
          profile: {
            name: 'alice',
            auth: {
              credentials: {
                password: 'secret',
                apiKey: 'key123',
              },
            },
          },
        },
      };

      logger.info(sanitizeLogData(complexData), 'Complex data');

      const loggedData = logSpy.mock.calls[0][0] as Record<string, unknown>;
      const userAuth = (loggedData.user as Record<string, unknown>).profile as Record<string, unknown>;
      const credentials = (userAuth.auth as Record<string, unknown>).credentials as Record<string, unknown>;

      expect(credentials.password).toBe('[REDACTED]');
      expect(credentials.apiKey).toBe('[REDACTED]');
    });
  });

  describe('performance', () => {
    it('should log quickly (< 1ms overhead)', () => {
      const logger = createLogger();
      const data = { message: 'test', count: 100 };

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        logger.info(data, 'Performance test');
      }

      const duration = performance.now() - start;
      const avgDuration = duration / 100;

      // Average should be well under 1ms per log call
      // Using 5ms as threshold to account for test environment variability
      expect(avgDuration).toBeLessThan(5);
    });

    it('should sanitize quickly even with complex objects', () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              level4: {
                password: 'secret',
                data: 'value',
              },
            },
          },
        },
        array: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          token: `token-${i}`,
        })),
      };

      const start = performance.now();
      const sanitized = sanitizeLogData(complexData);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // Should complete in < 10ms
      expect(sanitized.level1.level2.level3.level4.password).toBe('[REDACTED]');
      expect(sanitized.array[0].token).toBe('[REDACTED]');
    });
  });

  describe('correlation IDs', () => {
    it('should include correlation ID in all child logger logs', () => {
      const correlationId = 'test-correlation-123';
      const logger = createLogger(correlationId);

      const bindings = (logger as Logger).bindings();
      expect(bindings.correlationId).toBe(correlationId);
    });

    it('should maintain correlation ID across async operations', async () => {
      const correlationId = 'async-correlation-456';
      const logger = createLogger(correlationId);

      const asyncOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        const bindings = (logger as Logger).bindings();
        return bindings.correlationId;
      };

      const result = await asyncOperation();
      expect(result).toBe(correlationId);
    });

    it('should generate unique correlation IDs for each logger', () => {
      const logger1 = createLogger();
      const logger2 = createLogger();

      const bindings1 = (logger1 as Logger).bindings();
      const bindings2 = (logger2 as Logger).bindings();

      expect(bindings1.correlationId).not.toBe(bindings2.correlationId);
    });
  });

  describe('module loggers', () => {
    it('should create isolated loggers for different modules', () => {
      const taskLogger = createModuleLogger('TaskStore');
      const rulesLogger = createModuleLogger('RulesStore');

      const taskBindings = (taskLogger as Logger).bindings();
      const rulesBindings = (rulesLogger as Logger).bindings();

      expect(taskBindings.module).toBe('TaskStore');
      expect(rulesBindings.module).toBe('RulesStore');
    });

    it('should allow modules to add additional context', () => {
      const logger = createModuleLogger('TaskStore');
      const childLogger = logger.child({ taskId: 'task-123' });

      const bindings = (childLogger as Logger).bindings();
      expect(bindings.module).toBe('TaskStore');
      expect(bindings.taskId).toBe('task-123');
    });
  });
});
