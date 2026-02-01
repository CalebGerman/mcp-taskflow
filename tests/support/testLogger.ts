/**
 * Test Logger Utilities
 *
 * Provides logger configuration for test environments.
 * Separated from production code to maintain proper separation of concerns.
 */

import pino, { type Logger } from 'pino';

/**
 * Create a silent logger for tests
 *
 * @returns Logger configured with silent level
 */
export function createSilentLogger(): Logger {
  return pino({ level: 'silent' });
}

/**
 * Create a logger for debugging tests
 *
 * Only outputs when DEBUG environment variable is set
 *
 * @returns Logger configured for test debugging
 */
export function createTestLogger(): Logger {
  const level = process.env['DEBUG'] ? 'debug' : 'silent';
  return pino({ level });
}
