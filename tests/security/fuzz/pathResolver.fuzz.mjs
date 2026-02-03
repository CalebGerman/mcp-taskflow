/**
 * Jazzer.js fuzz target for sanitizePath
 */

import { FuzzedDataProvider } from '@jazzer.js/core';
import { sanitizePath } from '../../../src/config/pathResolver.js';

export function fuzz(data) {
  const provider = new FuzzedDataProvider(data);
  const base = provider.consumeString(64) || process.cwd();
  const userPath = provider.consumeRemainingAsString();

  try {
    sanitizePath(userPath, base);
  } catch {
    // Expected for invalid or traversal paths
  }
}
