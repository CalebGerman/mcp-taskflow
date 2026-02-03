/**
 * Security tests: input fuzzing
 */

import { describe, it, expect } from 'vitest';
import {
  CreateTaskParamsSchema,
  QueryTaskParamsSchema,
  UpdateTaskParamsSchema,
} from '../../src/data/schemas.js';

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-={}[]|;:",.<>/?`~';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)] ?? '';
  }
  return out;
}

describe('Security: input fuzzing', () => {
  it('should handle 1000 random create/update inputs without crashing', () => {
    for (let i = 0; i < 1000; i++) {
      const name = randomString(Math.floor(Math.random() * 600));
      const desc = randomString(Math.floor(Math.random() * 6000));

      const create = { name, description: desc };
      const update = { taskId: randomString(36), name, description: desc };

      const createResult = CreateTaskParamsSchema.safeParse(create);
      expect(createResult.success === true || createResult.success === false).toBe(true);

      const updateResult = UpdateTaskParamsSchema.safeParse(update);
      expect(updateResult.success === true || updateResult.success === false).toBe(true);
    }
  });

  it('should handle 1000 random query inputs without crashing', () => {
    for (let i = 0; i < 1000; i++) {
      const query = randomString(Math.floor(Math.random() * 700));
      const page = Math.floor(Math.random() * 5) + 1;
      const pageSize = Math.floor(Math.random() * 200) + 1;

      const result = QueryTaskParamsSchema.safeParse({ query, page, pageSize });
      expect(result.success === true || result.success === false).toBe(true);
    }
  });
});
