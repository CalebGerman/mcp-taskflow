/**
 * Security tests: log redaction
 */

import { describe, it, expect } from 'vitest';
import { sanitizeLogData } from '../../src/server/logger.js';

describe('Security: log redaction', () => {
  it('should redact secrets and tokens', () => {
    const input = {
      password: 'secret',
      token: 'tok_123',
      apiKey: 'key_456',
      nested: { authorization: 'Bearer abc', cookie: 'sid=123' },
    };

    const sanitized = sanitizeLogData(input) as Record<string, unknown>;

    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.apiKey).toBe('[REDACTED]');

    const nested = sanitized.nested as Record<string, unknown>;
    expect(nested.authorization).toBe('[REDACTED]');
    expect(nested.cookie).toBe('[REDACTED]');
  });

  it('should redact full paths to basenames', () => {
    const input = {
      path: '/var/app/secrets.json',
      filePath: 'C:\\Users\\Alice\\secret.txt',
    };

    const sanitized = sanitizeLogData(input) as Record<string, unknown>;

    expect(sanitized.path).toBe('secrets.json');
    expect(sanitized.filePath).toBe('secret.txt');
  });
});
